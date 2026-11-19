from rest_framework import viewsets, status, serializers
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.db import transaction, models
from django.utils import timezone
from django.http import FileResponse
from django.conf import settings
from datetime import date, timedelta 
from reportlab.lib.units import mm
from django.http import HttpResponse
from decimal import Decimal
from django.db.models import F, DecimalField, ExpressionWrapper, Q
from io import BytesIO
import os
import json 
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle
from reportlab.lib.utils import ImageReader
from stock.models import Stock, MouvementStock, Inventaire
from products.models import Produit
from.models import Chauffeur, DevisClient, DevisClientLigne, CommandeClient, CommandeClientLigne, BonLivraison, BonLivraisonLigne, FactureClient, FactureClientLigne, PaiementClient # <-- OVANA
from.serializers import  ChauffeurSerializer, DevisClientAdminSerializer, DevisClientCommercialSerializer, DevisClientStatutSerializer, DevisClientReadOnlySerializer, CommandeClientAdminSerializer, CommandeClientCommercialSerializer, CommandeClientMagasinierSerializer, CommandePourBLSerializer, BonLivraisonMagasinierSerializer, BonLivraisonTrackingSerializer, FactureClientReadOnlySerializer, FactureClientCreateSerializer, FacturePourPaiementSerializer, PaiementClientSerializer # <-- OVANA
from.permissions import IsAdminOrCommercial, IsAdminOrMagasinier, IsAdmin, VentePermission
from django.core.mail import EmailMessage
from django.conf import settings

def formatAr(val):
    return "{:,.2f}".format(Decimal(val or 0)).replace(",", " ")

def draw_logo_and_header(p, y, width, titre="FACTURE"):
    logo_path = os.path.join(settings.BASE_DIR, 'media', 'logo.png')
    try:
        if os.path.exists(logo_path):
            logo = ImageReader(logo_path)
            p.drawImage(logo, 2*cm, y - 2*cm, width=3.5*cm, height=2*cm, preserveAspectRatio=True, mask='auto')
    except Exception as e:
        print(f"[WARNING] Logo tsy azo vakina: {e}")

    p.setFont("Helvetica-Bold", 14)
    p.drawString(6.5*cm, y - 0.5*cm, "VOTRE SOCIETE LE ROMBA")
    p.setFont("Helvetica", 9)
    p.drawString(6.5*cm, y - 1*cm, "Adresse: Lot 1M77 Andranovato Manakara")
    p.drawString(6.5*cm, y - 1.5*cm, "NIF: 1000201619 / STAT: 51601231996000053")
    p.drawString(6.5*cm, y - 2*cm, "Tel: +261 34 02 327 21")
    p.setFont("Helvetica-Bold", 18)
    p.drawRightString(width - 2*cm, y - 0.5*cm, titre)

class DevisClientViewSet(viewsets.ModelViewSet):
    queryset = DevisClient.objects.select_related('client', 'commercial').prefetch_related('lignes')
    def get_serializer_class(self):
        if self.action in ['update', 'partial_update'] and set(self.request.data.keys()) == {'statut'}: return DevisClientStatutSerializer
        if self.request.user.role == 'ADMIN': return DevisClientAdminSerializer
        if self.request.user.role == 'COMMERCIAL': return DevisClientCommercialSerializer
        return DevisClientReadOnlySerializer
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']: return [IsAdminOrCommercial()]
        return [IsAuthenticated()]
    def get_queryset(self):
        user = self.request.user
        if user.role == 'COMMERCIAL': return DevisClient.objects.filter(commercial=user)
        return DevisClient.objects.all()
    def update(self, request, *args, **kwargs):
        devis = self.get_object()
        if set(request.data.keys()) == {'statut'}: return super().update(request, *args, **kwargs)
        if devis.statut!= 'BROUILLON': return Response({'error': 'Impossible de modifier un devis qui n\'est pas au statut BROUILLON'}, status=400)
        return super().update(request, *args, **kwargs)
    def destroy(self, request, *args, **kwargs):
        devis = self.get_object()
        if devis.statut!= 'BROUILLON': return Response({'error': 'Impossible de supprimer un devis qui n\'est pas au statut BROUILLON'}, status=400)
        return super().destroy(request, *args, **kwargs)
    

class CommandeClientViewSet(viewsets.ModelViewSet):
    queryset = CommandeClient.objects.select_related('client', 'commercial', 'devis').prefetch_related('lignes__produit')
    def get_serializer_class(self):
     if self.request.user.role == 'ADMIN': return CommandeClientAdminSerializer
     if self.request.user.role == 'COMMERCIAL': return CommandeClientCommercialSerializer
     if self.request.user.role == 'MAGASINIER': return CommandeClientMagasinierSerializer
     return CommandeClientAdminSerializer
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'valider']: return [IsAdminOrCommercial()]
        return [IsAuthenticated()]
    def get_queryset(self):
        user = self.request.user
        if user.role == 'COMMERCIAL': return CommandeClient.objects.filter(commercial=user)
        return CommandeClient.objects.all()
    def update(self, request, *args, **kwargs):
        commande = self.get_object()
        if set(request.data.keys()) == {'statut'}: return super().update(request, *args, **kwargs)
        if commande.statut!= 'EN_ATTENTE': return Response({'error': 'Impossible de modifier une commande qui n\'est pas EN_ATTENTE'}, status=400)
        return super().update(request, *args, **kwargs)
    def destroy(self, request, *args, **kwargs):
            commande = self.get_object()
            if commande.statut!= 'EN_ATTENTE': return Response({'error': 'Impossible de supprimer une commande qui n\'est pas EN_ATTENTE'}, status=400)
            if commande.bon_livraisons.exists() or FactureClient.objects.filter(bl__commande=commande).exists():
                return Response({'error': 'Impossible de supprimer cette commande car elle a déjà des BL ou Factures associées'}, status=400)
            return super().destroy(request, *args, **kwargs)

class ChauffeurViewSet(viewsets.ModelViewSet):
    queryset = Chauffeur.objects.all().order_by('-date_creation')
    serializer_class = ChauffeurSerializer
    permission_classes = [IsAdminOrMagasinier]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['actif']
    search_fields = ['nom', 'telephone', 'numero_permis']

class BonLivraisonViewSet(viewsets.ModelViewSet):
    queryset = BonLivraison.objects.select_related('commande', 'commande__client', 'chauffeur').prefetch_related('lignes__produit').order_by('date_livraison', 'id')

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return BonLivraisonMagasinierSerializer
        if self.action == 'commandes_disponibles':
            return CommandePourBLSerializer
        return BonLivraisonTrackingSerializer

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()
        statut = self.request.query_params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut)
        statut_livraison = self.request.query_params.get('statut_livraison')
        if statut_livraison:
            queryset = queryset.filter(statut_livraison=statut_livraison)
        commande_id = self.request.query_params.get('commande')
        if commande_id:
            queryset = queryset.filter(commande_id=commande_id)
        chauffeur_id = self.request.query_params.get('chauffeur')
        if chauffeur_id:
            queryset = queryset.filter(chauffeur_id=chauffeur_id)
        return queryset

    def create(self, request, *args, **kwargs):
        if request.user.role != 'MAGASINIER':
            return Response({'error': 'Réservé au Magasinier'}, 403)
        return super().create(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def commandes_disponibles(self, request):
        commandes = CommandeClient.objects.filter(statut__in=['VALIDEE', 'LIVREE_PARTIEL']).select_related('client', 'commercial')
        serializer = CommandePourBLSerializer(commandes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='disponibles-pour-facturation')
    def disponibles_pour_facturation(self, request):
        bls = BonLivraison.objects.filter(statut='VALIDEE', statut_livraison='LIVREE').select_related('commande', 'commande__client').order_by('date_livraison')
        serializer = BonLivraisonTrackingSerializer(bls, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def assigner(self, request, pk=None):
        if request.user.role != 'MAGASINIER':
            return Response({'error': 'Réservé au Magasinier'}, 403)
        bl = self.get_object()
        if bl.statut != 'VALIDEE':
            return Response({'error': 'BL tsy VALIDEE'}, 400)
        chauffeur_id = request.data.get('chauffeur')
        try:
            chauffeur = Chauffeur.objects.get(id=chauffeur_id)
        except Chauffeur.DoesNotExist:
            return Response({'error': 'Chauffeur introuvable'}, 404)
        bl.chauffeur = chauffeur
        bl.adresse_livraison = request.data.get('adresse', bl.commande.client.adresse)
        bl.save()
        return Response(BonLivraisonTrackingSerializer(bl).data)

    @action(detail=True, methods=['post'])
    def demarrer_livraison(self, request, pk=None):
        if request.user.role != 'MAGASINIER':
            return Response({'error': 'Réservé au Magasinier'}, 403)
        bl = self.get_object()
        if bl.statut_livraison != 'PRET':
            return Response({'error': 'Efa natomboka na tsy PRET'}, 400)
        bl.statut_livraison = 'EN_COURS'
        bl.date_depart = timezone.now()
        bl.save()
        return Response(BonLivraisonTrackingSerializer(bl).data)

    @action(detail=True, methods=['post'])
    def terminer_livraison(self, request, pk=None):
        if request.user.role != 'MAGASINIER':
            return Response({'error': 'Réservé au Magasinier'}, 403)
        bl = self.get_object()
        if bl.statut_livraison != 'EN_COURS':
            return Response({'error': 'Tsy EN_COURS'}, 400)
        bl.statut_livraison = 'LIVREE'
        bl.date_livraison_reelle = timezone.now()
        bl.nom_recepteur = request.data.get('nom_recepteur')
        bl.note_livraison = request.data.get('note')
        if 'preuve_photo' in request.FILES:
            bl.preuve_photo = request.FILES['preuve_photo']
        bl.save()
        return Response(BonLivraisonTrackingSerializer(bl).data)

    @action(detail=True, methods=['post'])
    def update_position(self, request, pk=None):
        if request.user.role != 'MAGASINIER':
            return Response({'error': 'Réservé au Magasinier'}, 403)
        bl = self.get_object()
        bl.latitude = request.data.get('latitude')
        bl.longitude = request.data.get('longitude')
        bl.save()
        return Response({'status': 'position saved'})

    @action(detail=True, methods=['post'])
    def notifier_client(self, request, pk=None):
        bl = self.get_object()
        print(f"SMS à {bl.client_nom}: Votre livraison {bl.numero} arrive!")
        return Response({'sms': 'sent'})

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        if request.user.role != 'MAGASINIER':
            return Response({'error': 'Réservé au Magasinier - Valider BL'}, 403)
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        old_statut = instance.statut
        new_statut = request.data.get('statut', old_statut)
        if set(request.data.keys()) != {'statut'}:
            if instance.statut != 'BROUILLON':
                return Response({'error': 'Impossible de modifier un BL qui n\'est pas BROUILLON'}, status=400)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        if old_statut == 'BROUILLON' and new_statut == 'VALIDEE':
            if not instance.lignes.exists():
                return Response({'error': 'Impossible de valider un BL sans lignes'}, status=400)
            for ligne in instance.lignes.all():
                stock_actuel = Stock.objects.filter(produit=ligne.produit).first()
                qte_stock = stock_actuel.quantite if stock_actuel else 0
                if qte_stock < ligne.quantite_livree:
                    raise serializers.ValidationError({'error': f'Stock insuffisant pour {ligne.produit.designation}. Disponible: {qte_stock}'})
            for ligne in instance.lignes.all():
                MouvementStock.objects.create(produit=ligne.produit, type='SORTIE_VENTE', quantite=ligne.quantite_livree, reference=f"BL-{instance.id}", motif=f"Bon Livraison N°{instance.numero or instance.id}")
                CommandeClientLigne.objects.filter(commande=instance.commande, produit=ligne.produit).update(quantite_livree=models.F('quantite_livree') + ligne.quantite_livree)
            cmd = instance.commande
            cmd.refresh_from_db()
            total_cmd = cmd.lignes.aggregate(total=models.Sum('quantite'))['total'] or 0
            total_livree = cmd.lignes.aggregate(total=models.Sum('quantite_livree'))['total'] or 0
            if total_livree >= total_cmd and total_cmd > 0:
                cmd.statut = 'LIVREE'
            elif total_livree > 0:
                cmd.statut = 'LIVREE_PARTIEL'
            cmd.save()
            instance.statut_livraison = 'PRET'
            instance.save()
        if old_statut == 'VALIDEE' and new_statut in ['ANNULEE', 'BROUILLON']:
            if hasattr(instance, 'facture') and instance.facture.statut in ['PAYEE', 'PARTIEL']:
                return Response({'error': 'Impossible d\'annuler ce BL car la facture a déjà des paiements'}, status=400)
            if hasattr(instance, 'facture'):
                instance.facture.delete()
            for ligne in instance.lignes.all():
                MouvementStock.objects.create(produit=ligne.produit, type='ENTREE_ANNULATION', quantite=ligne.quantite_livree, reference=f"BL-{instance.id}", motif=f"Annulation BL N°{instance.numero or instance.id}")
                CommandeClientLigne.objects.filter(commande=instance.commande, produit=ligne.produit).update(quantite_livree=models.F('quantite_livree') - ligne.quantite_livree)
            cmd = instance.commande
            cmd.refresh_from_db()
            total_livree = cmd.lignes.aggregate(total=models.Sum('quantite_livree'))['total'] or 0
            if total_livree == 0:
                cmd.statut = 'EN_ATTENTE'
            else:
                cmd.statut = 'LIVREE_PARTIEL'
            cmd.save()
        self.perform_update(serializer)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'MAGASINIER':
            return Response({'error': 'Réservé au Magasinier'}, 403)
        bl = self.get_object()
        if bl.statut != 'BROUILLON':
            return Response({'error': 'Impossible de supprimer un BL qui n\'est pas BROUILLON'}, status=400)
        return super().destroy(request, *args, **kwargs)

class FactureClientViewSet(viewsets.ModelViewSet):
    queryset = FactureClient.objects.select_related('client', 'bl__commande').prefetch_related('lignes__produit').order_by('id')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['statut', 'client', 'bl']
    search_fields = ['numero', 'client__contact_nom']
    permission_classes = [VentePermission]

    def get_serializer_class(self):
        if self.action == 'create':
            return FactureClientCreateSerializer
        return FactureClientReadOnlySerializer

    @action(detail=False, methods=['get'], url_path='impayees')
    def impayees(self, request):
            qs = self.get_queryset().annotate(
                _reste_calc = ExpressionWrapper(F('total_ttc') - F('montant_paye'), output_field=DecimalField())
            ).filter(_reste_calc__gt=0).exclude(statut__in=['PAYEE', 'ANNULEE'])
            serializer = self.get_serializer(qs, many=True)
            return Response(serializer.data)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        bl_id = serializer.validated_data['bon_livraison']
        try:
            bl = BonLivraison.objects.select_related('commande__client').prefetch_related('lignes__produit').get(id=bl_id)
        except BonLivraison.DoesNotExist:
            return Response({"error": "BL introuvable"}, status=404)

        if bl.statut!= 'VALIDEE' or bl.statut_livraison!= 'LIVREE':
            return Response({"error": f"Le BL doit être VALIDEE et LIVREE"}, status=400)

        if FactureClient.objects.filter(bl=bl).exclude(statut='ANNULEE').exists():
            facture_existante = FactureClient.objects.get(bl=bl)
            return Response({"error": f"Une facture {facture_existante.numero} existe déjà pour ce BL."}, status=400)

        facture = FactureClient.objects.create(
            bl=bl,
            client=bl.commande.client,
            date_facture=timezone.now().date(),
            date_echeance=timezone.now().date() + timedelta(days=30),
            statut='IMPAYEE'
        )

        total_ht = Decimal(0); total_tva = Decimal(0)
        for ligne_bl in bl.lignes.all():
            cmd_ligne = CommandeClientLigne.objects.filter(commande=bl.commande, produit=ligne_bl.produit).first()
            if not cmd_ligne: continue

            pu = Decimal(cmd_ligne.prix_unitaire_ht or 0)
            r = Decimal(cmd_ligne.remise or 0)
            t = Decimal(cmd_ligne.tva or 20)
            q = Decimal(ligne_bl.quantite_livree)

            if pu <= 0:
                facture.delete()
                return Response({"error": f"Le produit {ligne_bl.produit.designation} n'a pas de prix défini."}, status=400)

            ht = q * pu * (Decimal(1) - r / Decimal(100))
            tva_montant = ht * (t / Decimal(100))
            total_ht += ht; total_tva += tva_montant

            FactureClientLigne.objects.create(
                facture=facture, produit=ligne_bl.produit, quantite=q,
                prix_unitaire_ht=pu, remise=r, tva=t, total_ht=ht, total_ttc=ht+tva_montant
            )

        facture.total_ht = total_ht
        facture.total_tva = total_tva
        facture.total_ttc = total_ht + total_tva
        facture.save()

        read_serializer = FactureClientReadOnlySerializer(facture, context={'request': request})
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='pdf')
    def pdf(self, request, pk=None):
        facture = self.get_object()
        societe = {
                    'nom': 'VOTRE SOCIETE LE ROMBA',
                    'adresse': 'Lot 1M77 Andranovato Manakara',
                    'nif': '1000201619',
                    'stat': '51601231996000053',
                    'tel': '+261 02 327 21',
                            }

        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4

        p.setFont("Helvetica-Bold", 12)
        p.drawString(20*mm, height - 20*mm, societe['nom'])
        p.setFont("Helvetica", 9)
        p.drawString(20*mm, height - 25*mm, f"Adresse: {societe['adresse']}")
        p.drawString(20*mm, height - 30*mm, f"NIF: {societe['nif']} / STAT: {societe['stat']}")
        p.drawString(20*mm, height - 35*mm, f"Tel: {societe['tel']}")

        p.setFont("Helvetica-Bold", 18)
        p.drawRightString(width - 20*mm, height - 20*mm, "FACTURE CLIENT")
        p.setFont("Helvetica", 9)
        p.drawRightString(width - 20*mm, height - 25*mm, f"N°: {facture.numero}")
        p.drawRightString(width - 20*mm, height - 30*mm, f"Date: {facture.date_facture.strftime('%d/%m/%Y')}")
        p.drawRightString(width - 20*mm, height - 35*mm, f"Echéance: {facture.date_echeance.strftime('%d/%m/%Y')}")
        p.line(20*mm, height - 40*mm, width - 20*mm, height - 40*mm)

        p.setFont("Helvetica-Bold", 11)
        p.drawString(20*mm, height - 50*mm, "CLIENT")
        p.setFont("Helvetica", 10)
        p.drawString(20*mm, height - 55*mm, facture.client.contact_nom)
        p.drawString(20*mm, height - 60*mm, facture.client.adresse or '')
        p.drawString(20*mm, height - 65*mm, f"NIF: {facture.client.nif or ''}")
        if facture.bl:
            p.drawString(20*mm, height - 70*mm, f"BC LIÉ: {facture.bl.numero}")

        data = [['Produit', 'Qte', 'PU HT', 'Total HT']]
        for ligne in facture.lignes.all():
            data.append([
                ligne.produit.designation,
                f"{ligne.quantite:.2f}",
                f"{ligne.prix_unitaire_ht:,.2f} Ar",
                f"{ligne.total_ht:,.2f} Ar",
            ])

        table = Table(data, colWidths=[90*mm, 20*mm, 30*mm, 30*mm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2563eb')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 9),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,1), (-1,-1), 9),
        ]))

        table_height = len(data) * 6*mm + 6*mm
        table_y = height - 100*mm
        table.wrapOn(p, width, height)
        table.drawOn(p, 20*mm, table_y)

        y_tot = table_y - 15*mm
        p.setFont("Helvetica", 10)
        p.drawRightString(width - 50*mm, y_tot, "Total HT:")
        p.drawRightString(width - 20*mm, y_tot, f"{facture.total_ht:,.2f} Ar")
        y_tot -= 7*mm
        p.drawRightString(width - 50*mm, y_tot, "TVA:")
        p.drawRightString(width - 20*mm, y_tot, f"{facture.total_tva:,.2f} Ar")
        y_tot -= 7*mm
        p.setFont("Helvetica-Bold", 12)
        p.drawRightString(width - 50*mm, y_tot, "Total TTC:")
        p.drawRightString(width - 20*mm, y_tot, f"{facture.total_ttc:,.2f} Ar")

        footer_y = 30*mm
        p.setFont("Helvetica", 10)
        p.drawString(20*mm, footer_y + 6*mm, f"Montant payé: {facture.montant_paye:,.2f} Ar")
        p.drawString(20*mm, footer_y, f"Reste à payer: {facture.reste_a_payer:,.2f} Ar")
        p.drawRightString(width - 20*mm, footer_y + 3*mm, "Cachet et Signature")
        p.line(width - 80*mm, footer_y, width - 20*mm, footer_y)

        p.showPage()
        p.save()
        pdf = buffer.getvalue()
        buffer.close()

        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Facture_{facture.numero}.pdf"'
        return response
       

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.paiements.exists():
            return Response({'detail': 'Impossible de supprimer cette facture car elle a déjà des paiements associés.'}, status=status.HTTP_400_BAD_REQUEST)
        if instance.statut == 'PAYEE':
            return Response({'detail': 'Impossible de supprimer une facture PAYEE.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)
    @action(detail=True, methods=['post'], url_path='send-email')
    def send_email(self, request, pk=None):
            facture = self.get_object()
            
            if not facture.client.email:
                return Response({"error": "Ce client n'a pas d'email"}, status=400)
    
            societe = {
                        'nom': 'VOTRE SOCIETE LE ROMBA',
                        'adresse': 'Lot 1M77 Andranovato Manakara',
                        'nif': '1000201619',
                        'stat': '51601231996000053',
                        'tel': '+261 02 327 21',
                    }
            buffer = BytesIO()
            p = canvas.Canvas(buffer, pagesize=A4)
            width, height = A4
            p.setFont("Helvetica-Bold", 12)
            p.drawString(20*mm, height - 20*mm, societe['nom'])
            p.setFont("Helvetica", 9)
            p.drawString(20*mm, height - 25*mm, f"Adresse: {societe['adresse']}")
            p.drawString(20*mm, height - 30*mm, f"NIF: {societe['nif']} / STAT: {societe['stat']}")
            p.drawString(20*mm, height - 35*mm, f"Tel: {societe['tel']}")
            p.setFont("Helvetica-Bold", 18)
            p.drawRightString(width - 20*mm, height - 20*mm, "FACTURE CLIENT")
            p.setFont("Helvetica", 9)
            p.drawRightString(width - 20*mm, height - 25*mm, f"N°: {facture.numero}")
            p.drawRightString(width - 20*mm, height - 30*mm, f"Date: {facture.date_facture.strftime('%d/%m/%Y')}")
            p.drawRightString(width - 20*mm, height - 35*mm, f"Echéance: {facture.date_echeance.strftime('%d/%m/%Y')}")
            p.line(20*mm, height - 40*mm, width - 20*mm, height - 40*mm)
            p.setFont("Helvetica-Bold", 11)
            p.drawString(20*mm, height - 50*mm, "CLIENT")
            p.setFont("Helvetica", 10)
            p.drawString(20*mm, height - 55*mm, facture.client.contact_nom)
            p.drawString(20*mm, height - 60*mm, facture.client.adresse or '')
            p.drawString(20*mm, height - 65*mm, f"NIF: {facture.client.nif or ''}")
            if facture.bl:
                p.drawString(20*mm, height - 70*mm, f"BC LIÉ: {facture.bl.numero}")
            data = [['Produit', 'Qte', 'PU HT', 'Total HT']]
            for ligne in facture.lignes.all():
                data.append([
                    ligne.produit.designation,
                    f"{ligne.quantite:.2f}",
                    f"{ligne.prix_unitaire_ht:,.2f} Ar",
                    f"{ligne.total_ht:,.2f} Ar",
                ])
            table = Table(data, colWidths=[90*mm, 20*mm, 30*mm, 30*mm])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2563eb')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,0), 9),
                ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
                ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
                ('FONTSIZE', (0,1), (-1,-1), 9),
            ]))
            table_height = len(data) * 6*mm + 6*mm
            table_y = height - 100*mm
            table.wrapOn(p, width, height)
            table.drawOn(p, 20*mm, table_y)
            y_tot = table_y - 15*mm
            p.setFont("Helvetica", 10)
            p.drawRightString(width - 50*mm, y_tot, "Total HT:")
            p.drawRightString(width - 20*mm, y_tot, f"{facture.total_ht:,.2f} Ar")
            y_tot -= 7*mm
            p.drawRightString(width - 50*mm, y_tot, "TVA:")
            p.drawRightString(width - 20*mm, y_tot, f"{facture.total_tva:,.2f} Ar")
            y_tot -= 7*mm
            p.setFont("Helvetica-Bold", 12)
            p.drawRightString(width - 50*mm, y_tot, "Total TTC:")
            p.drawRightString(width - 20*mm, y_tot, f"{facture.total_ttc:,.2f} Ar")
            p.showPage()
            p.save()
            pdf_content = buffer.getvalue()
            buffer.close()
    
            # Envoi email avec PJ
            sujet = f"Facture {facture.numero} - {societe['nom']}"
            message = f"""Bonjour {facture.client.contact_nom},
    
    Veuillez trouver ci-joint votre facture {facture.numero} du {facture.date_facture.strftime('%d/%m/%Y')}.
    
    Montant TTC: {facture.total_ttc:,.2f} Ar
    Reste à payer: {facture.reste_a_payer:,.2f} Ar
    Échéance: {facture.date_echeance.strftime('%d/%m/%Y')}
    
    Merci pour votre confiance.
    
    Cordialement,
    {societe['nom']}
    {societe['tel']}
    """
    
            try:
                email = EmailMessage(
                    subject=sujet,
                    body=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[facture.client.email],
                )
                email.attach(f"Facture_{facture.numero}.pdf", pdf_content, 'application/pdf')
                email.send(fail_silently=False)
                return Response({"message": f"Facture envoyée à {facture.client.email}"})
            except Exception as e:
                return Response({"error": str(e)}, status=500)
class PaiementClientViewSet(viewsets.ModelViewSet):
    queryset = PaiementClient.objects.select_related('facture__client')
    serializer_class = PaiementClientSerializer
    def get_permissions(self): return [VentePermission()]

    @action(detail=True, methods=['get'], url_path='pdf', permission_classes=[IsAuthenticated])
    def pdf_recu(self, request, pk=None):
        paiement = self.get_object()
        if request.user.role not in ['ADMIN', 'COMPTABLE']:
            return Response({'detail': 'Tsy manana alalana haka Reçu'}, status=403)

        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        y = height - 2*cm
        draw_logo_and_header(p, y, width, "RECU DE PAIEMENT")
        p.setFont("Helvetica", 10)
        p.drawString(2*cm, y - 4*cm, f"N° Reçu: {paiement.numero}")
        p.drawString(2*cm, y - 4.5*cm, f"Date: {paiement.date_paiement.strftime('%d/%m/%Y')}")
        p.setFont("Helvetica-Bold", 12)
        p.drawString(2*cm, y - 6*cm, "RECU DE:")
        p.setFont("Helvetica", 10)
        p.drawString(2*cm, y - 6.5*cm, paiement.facture.client.contact_nom)
        p.setFont("Helvetica-Bold", 12)
        p.drawString(2*cm, y - 8*cm, "POUR LE REGLEMENT DE LA FACTURE:")
        p.setFont("Helvetica", 10)
        p.drawString(2*cm, y - 8.5*cm, f"N° {paiement.facture.numero} du {paiement.facture.date_facture.strftime('%d/%m/%Y')}")
        p.drawString(2*cm, y - 9*cm, f"Montant Facture: {formatAr(paiement.facture.total_ttc)} Ar")
        p.setFont("Helvetica-Bold", 14)
        p.drawString(2*cm, y - 11*cm, f"MONTANT PAYE: {formatAr(paiement.montant)} Ar")
        p.setFont("Helvetica", 10)
        p.drawString(2*cm, y - 11.5*cm, f"Mode: {paiement.get_mode_paiement_display()}")
        p.drawString(2*cm, y - 12*cm, f"Référence: {paiement.reference or '-'}")
        p.setFont("Helvetica-Bold", 12)
        p.drawString(2*cm, y - 13.5*cm, f"RESTE A PAYER: {formatAr(paiement.facture.reste_a_payer)} Ar")
        p.setFont("Helvetica", 8)
        p.drawString(2*cm, 3*cm, "Signature Client:..........................")
        p.drawString(12*cm, 3*cm, "Signature et Cachet:..........................")
        p.showPage()
        p.save()
        buffer.seek(0)
        return FileResponse(buffer, as_attachment=False, filename=f"Recu_{paiement.numero}.pdf")

    @action(detail=False, methods=['get'], url_path='factures-impayees')
    def factures_impayees(self, request):
        factures_qs = FactureClient.objects.filter(statut__in=['IMPAYEE', 'PARTIEL']).select_related('client')
        factures_filtre = [f for f in factures_qs if f.reste_a_payer > 0]
        serializer = FacturePourPaiementSerializer(factures_filtre, many=True)
        return Response(serializer.data)

    @transaction.atomic
    def perform_create(self, serializer):
        paiement = serializer.save()
        facture = paiement.facture
        facture.montant_paye = Decimal(facture.montant_paye or 0) + Decimal(paiement.montant)
        if facture.montant_paye >= facture.total_ttc: facture.statut = 'PAYEE'
        elif facture.montant_paye > 0: facture.statut = 'PARTIEL'
        else: facture.statut = 'IMPAYEE'
        facture.save()
