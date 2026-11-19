from rest_framework import permissions 
from rest_framework.response import Response
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from decimal import Decimal
from django.db import transaction
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.conf import settings
from django.core.mail import send_mail
from xhtml2pdf import pisa
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle
from reportlab.lib.utils import ImageReader
from io import BytesIO
from django.http import FileResponse
import os
from io import BytesIO
from django.template.loader import get_template
from .models import * 
from .serializers import * 
from .permissions import * 
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from stock.models import MouvementStock, Stock
import traceback
from vente.models import Chauffeur  
from vente.serializers import ChauffeurSerializer

def formatAr(val):
    return "{:,.2f}".format(Decimal(val or 0)).replace(",", " ")

def draw_logo_and_header_achat(p, y, width, titre="FACTURE FOURNISSEUR"):
    logo_path = os.path.join(settings.BASE_DIR, 'media', 'logo.png') 
    try:
        if os.path.exists(logo_path):
            logo = ImageReader(logo_path)
            p.drawImage(logo, 2*cm, y - 2*cm, width=3.5*cm, height=2*cm, preserveAspectRatio=True, mask='auto')
    except Exception as e:
        print(f"[WARNING] Logo tsy azo vakina: {e}")

    p.setFont("Helvetica-Bold", 14)
    p.drawString(6.5*cm, y - 0.5*cm, "VOTRE SOCIETE LEROMBA") 
    p.setFont("Helvetica", 9)
    p.drawString(6.5*cm, y - 1*cm, "Adresse: Lot 1M77 Andranovato Manakara")
    p.drawString(6.5*cm, y - 1.5*cm, "NIF: 1000201619 / STAT: 511601231996000053")
    p.drawString(6.5*cm, y - 2*cm, "Tel: +261 34 02 327 21")
    p.setFont("Helvetica-Bold", 18)
    p.drawRightString(width - 2*cm, y - 0.5*cm, titre)



class DemandeAchatViewSet(viewsets.ModelViewSet):
    queryset = DemandeAchat.objects.all().order_by('-date_demande')
    serializer_class = DemandeAchatSerializer

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter
    ]

    filterset_fields = ['statut', 'demande_par']
    search_fields = ['numero', 'note']
    ordering = ['-date_demande']

    def get_permissions(self):
        if self.action == 'create':
            self.permission_classes = [
                IsAuthenticated,
                IsAcheteur 
            ]

        elif self.action in ['update', 'partial_update']:
            self.permission_classes = [
                IsAuthenticated,
                IsAcheteur | IsAdmin
            ]

        elif self.action == 'destroy':
            self.permission_classes = [
                IsAuthenticated,
                IsAdmin
            ]

        else:
            self.permission_classes = [
                IsAuthenticated,
                IsAcheteur |
                IsCommercial |
                IsMagasinier |
                IsComptable |
                IsAdmin
            ]

        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(demande_par=self.request.user)

    @action(detail=True, methods=['patch'])
    def changer_statut(self, request, pk=None):
        demande = self.get_object()
        nouveau_statut = request.data.get('statut')
        demande.statut = nouveau_statut
        demande.save()
        return Response(
            DemandeAchatSerializer(demande).data
        )
        

class DemandePrixCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        demande_achat_id = request.data.get('demande_achat')
        if not demande_achat_id:
            return Response({"demande_achat": ["Ce champ est obligatoire."]}, status=400)

        try:
            demande_achat = DemandeAchat.objects.get(id=demande_achat_id)
        except DemandeAchat.DoesNotExist:
            return Response({"demande_achat": ["ID tsy hita"]}, status=400)

        if DemandePrix.objects.filter(demande_achat=demande_achat).exists():
            return Response(
                {"demande_achat": ["Il existe déjà une Demande de Prix pour cette DA"]},
                status=400
            )

        auj = timezone.now()
        prefix = f"DP-{auj.strftime('%Y%m%d')}-"
        last_dp = DemandePrix.objects.filter(numero__startswith=prefix).order_by('-id').first()
        next_num = 1 if not last_dp else int(last_dp.numero.split('-')[-1]) + 1
        numero = f"{prefix}{next_num}"
        objet = f"Demande de prix pour {demande_achat.numero}"

        dp = DemandePrix.objects.create(
            demande_achat=demande_achat,
            numero=numero,
            objet=objet,
            date_envoi=auj
        )
        serializer = DemandePrixSerializer(dp)
        return Response(serializer.data, status=201)

class DemandePrixViewSet(viewsets.ModelViewSet):
    queryset = DemandePrix.objects.all().order_by('-id')
    serializer_class = DemandePrixSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['statut', 'demande_achat']
    search_fields = ['numero', 'objet']
    ordering = ['-date_envoi']

    def perform_create(self, serializer):
        demande_achat = serializer.validated_data.get('demande_achat')
        auj = timezone.now()
        prefix = f"DP-{auj.strftime('%Y%m%d')}-"
        last_dp = DemandePrix.objects.filter(numero__startswith=prefix).order_by('-id').first()
        next_num = 1 if not last_dp else int(last_dp.numero.split('-')[-1]) + 1
        numero = f"{prefix}{next_num}"
        objet = f"Demande de prix pour {demande_achat.numero}" if demande_achat else "Demande de prix"
        serializer.save(numero=numero, objet=objet, date_envoi=auj)

    @action(detail=True, methods=['post'], url_path='envoyer-email')
    def envoyer_email(self, request, pk=None):
        try:
            dp = self.get_object()
            fournisseur_id = request.data.get('fournisseur_id')

            lignes_qs = LigneDemandePrix.objects.filter(demande_prix=dp)
            print(f"[DEBUG] DP {dp.id} -> {lignes_qs.count()} lignes")

            if fournisseur_id:
                lignes_qs = lignes_qs.filter(fournisseur_id=fournisseur_id)

            lignes = lignes_qs.filter(fournisseur__isnull=False).select_related('fournisseur', 'produit')

            if not lignes.exists():
                return Response({
                    "detail": f"Aucune ligne avec fournisseur pour DP {dp.numero}. Enregistrez d'abord!",
                    "total_lignes_dp": LigneDemandePrix.objects.filter(demande_prix=dp).count()
                }, status=400)

            map_fournisseur = {}
            for l in lignes:
                f = l.fournisseur
                if not f.email:
                    continue
                if f.id not in map_fournisseur:
                    map_fournisseur[f.id] = {"fournisseur": f, "lignes": []}
                map_fournisseur[f.id]["lignes"].append(l)

            if not map_fournisseur:
                return Response({"detail": "Fournisseurs sans email"}, status=400)

            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or getattr(settings, 'EMAIL_HOST_USER', 'noreply@leromba.mg')

            nb_envoye = 0
            erreurs = []

            # Fonction safe pour quantité - tsy crash na inona field anao
            def get_qte(ligne):
                for attr in ['quantite', 'quantite_demandee', 'qte', 'quantite_proposee', 'qte_demandee', 'qte_proposee']:
                    if hasattr(ligne, attr):
                        val = getattr(ligne, attr)
                        if val not in [None, '']:
                            return val
                return ''

            def get_code_designation(ligne):
                if ligne.produit:
                    code = getattr(ligne.produit, 'code', '')
                    des = getattr(ligne.produit, 'designation', '') or getattr(ligne.produit, 'nom', '')
                    qte = get_qte(ligne)
                    return f"- {code} {des} (Qté: {qte})" if qte else f"- {code} {des}"
                return f"- Ligne {ligne.id}"

            for data_f in map_fournisseur.values():
                f = data_f["fournisseur"]
                prods = data_f["lignes"]
                liste = "\n".join([get_code_designation(l) for l in prods])

                msg = f"""Bonjour {f.raison_sociale},

Demande de Prix {dp.numero} - {dp.objet or ''}

Produits demandés:
{liste}

Merci de nous envoyer votre meilleure offre avec prix unitaire et délai.

Cordialement,
Service Achats - LE ROMBA
"""

                try:
                    send_mail(
                        subject=f"Demande de Prix {dp.numero}",
                        message=msg,
                        from_email=from_email,
                        recipient_list=[f.email],
                        fail_silently=False
                    )
                    nb_envoye += 1
                    print(f"[OK] {f.email}")
                except Exception as e:
                    traceback.print_exc()
                    erreurs.append(f"{f.email}: {str(e)}")

            if nb_envoye == 0 and erreurs:
                return Response({"detail": f"Erreur SMTP: {'; '.join(erreurs)}"}, status=500)

            return Response({
                "message": f"{nb_envoye} email(s) envoyé(s)",
                "nb_envoye": nb_envoye,
                "erreurs": erreurs
            })

        except Exception as e:
            traceback.print_exc()
            return Response({
                "detail": f"Erreur serveur: {str(e)}",
                "trace": traceback.format_exc()
            }, status=500)
    
class ChauffeurViewSet(viewsets.ModelViewSet):
    queryset = Chauffeur.objects.all().order_by('-date_creation')
    serializer_class = ChauffeurSerializer
    permission_classes = [IsAdminOrMagasinier]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['actif']
    search_fields = ['nom', 'telephone', 'numero_permis']
    
class AchatViewSet(viewsets.ModelViewSet):
    queryset = Achat.objects.all()
    serializer_class = AchatSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['statut', 'fournisseur', 'chauffeur']
    search_fields = ['numero', 'adresse_livraison']
    ordering = ['date_achat']

    def get_permissions(self):
        if self.action == "create":
            self.permission_classes = [IsAuthenticated, IsAcheteur]
        elif self.action == "valider":
            self.permission_classes = [IsAuthenticated, IsAdmin]  
        elif self.action == "annuler":
            self.permission_classes = [IsAuthenticated, IsAcheteur | IsAdmin]  
        elif self.action in ["partial_update", "update"]:
            self.permission_classes = [IsAuthenticated, IsAcheteur]
        elif self.action == "destroy":
            self.permission_classes = [IsAuthenticated, IsAdmin]
        else:
            self.permission_classes = [IsAuthenticated, AchatPermission]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)
    @action(detail=True, methods=['patch'], url_path='valider')
    def valider(self, request, pk=None):
        achat = self.get_object()
        if achat.statut != 'BROUILLON':
            return Response({'error': 'BROUILLON ihany no azo valider'}, status=400)
        achat.statut = 'EN_ATTENTE'
        achat.save()
        return Response(AchatSerializer(achat).data)

    @action(detail=True, methods=['patch'], url_path='annuler')
    def annuler(self, request, pk=None):
        achat = self.get_object()
        role = str(getattr(request.user, 'role', '')).upper()
        if role == 'ACHETEUR':
            if achat.statut != 'BROUILLON' or achat.cree_par_id != request.user.id:
                return Response({'error': 'Tsy afaka annuler'}, status=403)
        if achat.statut not in ['BROUILLON', 'EN_ATTENTE']:
            return Response({'error': 'Tsy azo annuler intsony'}, status=400)

        achat.statut = 'ANNULER'   
        achat.save()
        return Response(AchatSerializer(achat).data)
    @action(detail=True, methods=['patch'], url_path='mettre-pret', permission_classes=[IsAuthenticated, IsMagasinier | IsAdmin])
    def mettre_pret(self, request, pk=None): 
        achat = self.get_object()
        if achat.statut != 'EN_ATTENTE':
            return Response({'error': 'Ny BC dia tsy maintsy EN_ATTENTE vao afaka atao PRET'}, status=400)
        achat.statut = 'PRET'
        achat.save()
        return Response(AchatSerializer(achat).data)
    @action(detail=True, methods=['patch'], url_path='recu-partiel', permission_classes=[IsAuthenticated, IsMagasinier | IsAdmin])
    def recu_partiel(self, request, pk=None):
        achat = self.get_object()
        if achat.statut not in ['EN_COURS_LIVRAISON', 'PARTIELLEMENT_RECUE']:
            return Response({'error': 'Tsy azo atao Reçu partiel raha tsy EN_COURS'}, status=400)
        
        achat.statut = 'PARTIELLEMENT_RECUE'
        achat.save()
        return Response(AchatSerializer(achat).data)

    @action(detail=True, methods=['patch'], url_path='livre', permission_classes=[IsAuthenticated, IsMagasinier | IsAdmin])
    def livre(self, request, pk=None):
        achat = self.get_object()
        if achat.statut not in ['PARTIELLEMENT_RECUE']:
            return Response({'error': 'Tsy azo atao Livré raha tsy Reçu partiel'}, status=400)
        
        achat.statut = 'RECUE'
        achat.save()
        return Response(AchatSerializer(achat).data)
    @action(detail=True, methods=['patch'], url_path='affecter-livraison', permission_classes=[IsAuthenticated, IsAcheteur | IsAdmin])
    def affecter_livraison(self, request, pk=None):
        achat = self.get_object()
        if achat.statut not in ['PRET', 'EN_ATTENTE']:
            return Response({"error": "Mety afindra any PRET vao afaka affecter"}, status=400)
    
        achat.chauffeur_id = request.data.get('chauffeur')
        achat.adresse_livraison = request.data.get('adresse_livraison')
        achat.date_depart = request.data.get('date_depart')
        achat.statut = 'EN_COURS_LIVRAISON'
        achat.save()
        return Response(AchatSerializer(achat).data)
    @action(detail=True, methods=['post'], url_path='assigner', permission_classes=[IsAuthenticated, IsMagasinier | IsAdmin])
    def assigner(self, request, pk=None):
        achat = self.get_object()
        if achat.statut != 'PRET':
            return Response({'error': 'Ny BC dia tsy maintsy PRET vao afaka assigner chauffeur'}, status=status.HTTP_400_BAD_REQUEST)
        chauffeur_id = request.data.get('chauffeur')
        if not chauffeur_id:
            return Response({'error': 'Chauffeur obligatoire'}, status=status.HTTP_400_BAD_REQUEST)
        try: 
            chauffeur = Chauffeur.objects.get(id=chauffeur_id)
            achat.chauffeur = chauffeur
        except Chauffeur.DoesNotExist: 
            return Response({'error': 'Chauffeur introuvable'}, status=status.HTTP_404_NOT_FOUND)
        achat.adresse_livraison = request.data.get('adresse_livraison')
        achat.date_depart = request.data.get('date_depart')
        achat.statut = 'EN_COURS_LIVRAISON' 
        achat.save()
        return Response(AchatSerializer(achat).data, status=status.HTTP_200_OK)
    @action(detail=True, methods=['get'], url_path='pdf')
    def pdf(self, request, pk=None):
        achat = self.get_object()
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        y = height - 2*cm

        # HEADER
        draw_logo_and_header_achat(p, y, width, "BON DE COMMANDE") # Mampiasa ilay fonction anao
        y = y - 3*cm

        # INFOS BC
        p.setFont("Helvetica", 10)
        p.drawString(2*cm, y, f"N° BC: {achat.numero}")
        p.drawString(2*cm, y - 0.6*cm, f"Date: {achat.date_achat.strftime('%d/%m/%Y')}")
        p.drawString(2*cm, y - 1.2*cm, f"Statut: {achat.get_statut_display()}")
        
        p.drawRightString(width - 2*cm, y, f"FOURNISSEUR:")
        p.setFont("Helvetica-Bold", 10)
        p.drawRightString(width - 2*cm, y - 0.6*cm, achat.fournisseur.raison_sociale)
        p.setFont("Helvetica", 10)
        p.drawRightString(width - 2*cm, y - 1.2*cm, achat.fournisseur.adresse or '')
        p.line(2*cm, y - 2*cm, width - 2*cm, y - 2*cm)

        # TABLEAU LIGNES
        y = y - 3*cm
        data = [['#', 'DESIGNATION', 'QTE', 'PU HT', 'TOTAL HT']]
        for i, ligne in enumerate(achat.lignes.all(), 1):
            data.append([
                str(i),
                ligne.produit.designation[:50],
                formatAr(ligne.quantite),
                f"{formatAr(ligne.prix_achat_unitaire)} Ar",
                f"{formatAr(ligne.total_ht)} Ar"
            ])

        t = Table(data, colWidths=[1.2*cm, 8*cm, 2.5*cm, 2.5*cm, 2.8*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#16a34a')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (2,1), (-1,-1), 'RIGHT'),
            ('ALIGN', (0,1), (1,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('FONTSIZE', (0,0), (-1,-1), 9)
        ]))
        t.wrapOn(p, width, height)
        t.drawOn(p, 2*cm, y - (len(data) * 0.7*cm))

        # TOTAL
        y = y - (len(data) * 0.7*cm) - 1*cm
        p.setFont("Helvetica-Bold", 12)
        p.drawRightString(width - 2*cm, y, f"TOTAL HT: {formatAr(achat.total_ht)} Ar")

        # FOOTER
        p.setFont("Helvetica", 8)
        p.drawString(2*cm, 2*cm, "Signature Fournisseur: .........................")
        p.drawString(12*cm, 2*cm, "Signature et Cachet: .........................")

        p.showPage()
        p.save()
        buffer.seek(0)
        return FileResponse(buffer, as_attachment=True, filename=f"BC-{achat.numero}.pdf")

class FactureFournisseurViewSet(viewsets.ModelViewSet):
    queryset = FactureFournisseur.objects.select_related('achat__fournisseur').all()
    serializer_class = FactureFournisseurSerializer
    filterset_fields = ['statut', 'date_facture', 'date_echeance', 'achat']
    search_fields = ['numero_facture', 'achat__numero', 'achat__fournisseur__raison_sociale']
    ordering_fields = ['numero_facture', 'date_facture', 'date_echeance', 'montant_ttc', 'id']
    ordering = ['id']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    def get_permissions(self):
        if self.action in ['create','update','destroy']:
            self.permission_classes = [IsAuthenticated, IsComptable | IsAdmin]
        else:
            self.permission_classes = [IsAuthenticated, IsComptable | IsAcheteur | IsAdmin | IsMagasinier | IsCommercial]
        return super().get_permissions()

    @action(detail=False, methods=['get'], url_path='impayees')
    def factures_impayees(self, request):
        factures_qs = FactureFournisseur.objects.filter(statut__in=['IMPAYEE', 'PARTIEL']).select_related('achat__fournisseur')
        factures = [f for f in factures_qs if f.reste_a_payer > 0]
        serializer = FactureFournisseurPourPaiementSerializer(factures, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='pdf', permission_classes=[IsAuthenticated])
    def pdf_facture(self, request, pk=None):
        facture = self.get_object()
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        y = height - 2*cm
        draw_logo_and_header_achat(p, y, width, "FACTURE FOURNISSEUR") # Mandeha izao

        p.setFont("Helvetica", 10)
        p.drawRightString(width - 2*cm, y - 1*cm, f"N°: {facture.numero_facture}")
        p.drawRightString(width - 2*cm, y - 1.5*cm, f"Date: {facture.date_facture.strftime('%d/%m/%Y')}")
        p.drawRightString(width - 2*cm, y - 2*cm, f"Echéance: {facture.date_echeance.strftime('%d/%m/%Y')}")
        p.line(2*cm, y - 2.5*cm, width - 2*cm, y - 2.5*cm)

        y = y - 3.5*cm
        p.setFont("Helvetica-Bold", 12)
        p.drawString(2*cm, y, "FOURNISSEUR")
        p.setFont("Helvetica", 10)
        p.drawString(2*cm, y - 0.6*cm, facture.achat.fournisseur.raison_sociale)
        p.drawString(2*cm, y - 1.1*cm, facture.achat.fournisseur.adresse or '')
        p.drawString(2*cm, y - 1.6*cm, f"NIF: {facture.achat.fournisseur.nif or '-'}")

        y = y - 3*cm
        data = [['Produit', 'Qte', 'PU HT', 'Total HT']]
        for ligne in facture.achat.lignes.all():
            data.append([
                ligne.produit.designation[:40],
                f"{formatAr(ligne.quantite)}",
                f"{formatAr(ligne.prix_achat_unitaire)} Ar",
                f"{formatAr(ligne.total_ht)} Ar"
            ])

        t = Table(data, colWidths=[9*cm, 2*cm, 3*cm, 3*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2563eb')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (1,1), (-1,-1), 'RIGHT'),
            ('ALIGN', (0,1), (0,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('FONTSIZE', (0,0), (-1,-1), 9)
        ]))
        t.wrapOn(p, width, height)
        t.drawOn(p, 2*cm, y - (len(data) * 0.7*cm))

        y = y - (len(data) * 0.7*cm) - 1*cm
        p.setFont("Helvetica", 10)
        p.drawRightString(14*cm, y, f"Total HT:")
        p.drawRightString(17*cm, y, f"{formatAr(facture.achat.total_ht)} Ar")
        p.setFont("Helvetica-Bold", 12)
        p.drawRightString(14*cm, y-1.2*cm, f"Total TTC:")
        p.drawRightString(17*cm, y-1.2*cm, f"{formatAr(facture.montant_ttc)} Ar")
        p.setFont("Helvetica", 9)
        p.drawString(2*cm, 3*cm, f"Montant payé: {formatAr(facture.montant_regle)} Ar")
        p.drawString(2*cm, 2.5*cm, f"Reste à payer: {formatAr(facture.reste_a_payer)} Ar")
        p.drawRightString(width - 2*cm, 3*cm, "Cachet et Signature")
        p.showPage()
        p.save()
        buffer.seek(0)
        return FileResponse(buffer, as_attachment=False, filename=f"{facture.numero_facture}.pdf")

class PaiementFournisseurViewSet(viewsets.ModelViewSet):
    queryset = PaiementFournisseur.objects.select_related('facture__achat__fournisseur').all()
    serializer_class = PaiementFournisseurSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['facture']
    ordering = ['date_paiement']
    permission_classes = [IsAuthenticated, IsComptable | IsAdmin]

    @transaction.atomic
    def perform_create(self, serializer):
        serializer.save()

    @transaction.atomic
    def perform_destroy(self, instance):
        instance.delete()

    @action(detail=True, methods=['get'], url_path='pdf', permission_classes=[IsAuthenticated])
    def pdf_recu(self, request, pk=None):
        paiement = self.get_object()

        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        y = height - 2*cm
        draw_logo_and_header_achat(p, y, width, "RECU DE PAIEMENT")

        p.setFont("Helvetica", 10)
        p.drawString(2*cm, y - 4*cm, f"N° Reçu: {paiement.numero}")
        p.drawString(2*cm, y - 4.5*cm, f"Date: {paiement.date_paiement.strftime('%d/%m/%Y')}")

        p.setFont("Helvetica-Bold", 12)
        p.drawString(2*cm, y - 6*cm, "RECU DE:")
        p.setFont("Helvetica", 10)
        p.drawString(2*cm, y - 6.5*cm, paiement.facture.achat.fournisseur.raison_sociale)

        p.setFont("Helvetica-Bold", 12)
        p.drawString(2*cm, y - 8*cm, "POUR LE REGLEMENT DE LA FACTURE:")
        p.setFont("Helvetica", 10)
        p.drawString(2*cm, y - 8.5*cm, f"N° {paiement.facture.numero_facture} du {paiement.facture.date_facture.strftime('%d/%m/%Y')}")
        p.drawString(2*cm, y - 9*cm, f"BC: {paiement.facture.achat.numero}")
        p.drawString(2*cm, y - 9.5*cm, f"Montant Facture: {formatAr(paiement.facture.montant_ttc)} Ar")

        p.setFont("Helvetica-Bold", 14)
        p.drawString(2*cm, y - 11*cm, f"MONTANT PAYE: {formatAr(paiement.montant)} Ar")

        p.setFont("Helvetica", 10)
        p.drawString(2*cm, y - 11.5*cm, f"Mode: {paiement.get_mode_paiement_display()}")
        p.drawString(2*cm, y - 12*cm, f"Référence: {paiement.reference or '-'}")

        p.setFont("Helvetica-Bold", 12)
        p.drawString(2*cm, y - 13.5*cm, f"RESTE A PAYER: {formatAr(paiement.facture.reste_a_payer)} Ar")

        p.setFont("Helvetica", 8)
        p.drawString(2*cm, 3*cm, "Signature Fournisseur:..........................")
        p.drawString(12*cm, 3*cm, "Signature et Cachet:..........................")

        p.showPage()
        p.save()
        buffer.seek(0)
        return FileResponse(buffer, as_attachment=False, filename=f"Recu_{paiement.numero}.pdf")

class RetourFournisseurViewSet(viewsets.ModelViewSet):
    queryset = RetourFournisseur.objects.all()
    serializer_class = RetourFournisseurSerializer
    def get_permissions(self):
        if self.action == 'create':
            self.permission_classes = [IsAuthenticated, IsMagasinier | IsAdmin]
        else:
            self.permission_classes = [IsAuthenticated, IsMagasinier | IsComptable | IsAcheteur | IsAdmin]
        return super().get_permissions()

class LigneDemandePrixViewSet(viewsets.ModelViewSet):
    serializer_class = LigneDemandePrixSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering = ['id']

    def get_queryset(self):
        queryset = LigneDemandePrix.objects.select_related('produit', 'fournisseur', 'demande_prix')

        # ITO NO LEHIBE: maka ny demande_prix avy amin'ny URL
        demande_prix_id = self.request.query_params.get('demande_prix')
        if demande_prix_id:
            queryset = queryset.filter(demande_prix_id=demande_prix_id)

        return queryset

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()
        
class ReceptionViewSet(viewsets.ModelViewSet):
    queryset = Reception.objects.all().select_related(
        'bon_commande', 'bon_commande__fournisseur', 'cree_par'
    ).prefetch_related('lignes__produit')
    serializer_class = ReceptionSerializer
    permission_classes = [IsAuthenticated, IsMagasinier | IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['bon_commande']
    search_fields = ['numero', 'note']
    ordering = ['-date_reception']

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context
    
class ProduitScanView(APIView):
    permission_classes = [IsAuthenticated, IsMagasinier | IsAdmin]
    
    def get(self, request):
        code = request.query_params.get('code')
        if not code: return Response({"error": "Code requis"}, status=400)
        produit = Produit.objects.filter(code=code, is_active=True).first()
        if not produit: return Response({"error": "Produit non trouvé"}, status=404)
        stock = Stock.objects.filter(produit=produit).first()
        data = {"id": produit.id, "code": produit.code, "designation": produit.designation, "stock_actuel": stock.quantite if stock else 0}
        return Response(data)

class ReceptionViewSet(viewsets.ModelViewSet):
    queryset = Reception.objects.all().select_related(
        'bon_commande', 'bon_commande__fournisseur', 'cree_par'
    ).prefetch_related('lignes__produit')
    serializer_class = ReceptionSerializer
    permission_classes = [IsAuthenticated, IsMagasinier | IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['bon_commande']
    search_fields = ['numero', 'note']
    ordering = ['-date_reception']

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context
    