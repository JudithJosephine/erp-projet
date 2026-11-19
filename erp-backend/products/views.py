from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from django.db import transaction
from django.db.models import Q
from.models import Produit, Categorie, HistoriqueStock, AuditLog, Fournisseur, BonCommande, LigneBonCommande
from.serializers import ProduitSerializer, CategorieSerializer, AuditLogSerializer, MouvementStockSerializer, HistoriqueStockSerializer, FournisseurSerializer, BonCommandeSerializer, LigneBonCommandeSerializer
from stock.models import MouvementStock, Stock # <-- ITO NO VAOVAO: Mifandray @ app stock
from rest_framework.pagination import PageNumberPagination

class StandardPagination(PageNumberPagination):
    page_size = 5
    page_size_query_param = 'page_size'
    max_page_size = 100
    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'page_actuelle': self.page.number,
            'total_pages': self.page.paginator.num_pages,
            'results': data
        })

def get_role(request):
    return str(getattr(request.user, 'role', '')).strip().upper()

def check_role(request, *roles):
    user_role = get_role(request)
    if user_role == "ADMIN":
        return
    if user_role not in [r.upper() for r in roles]:
        raise PermissionDenied(detail=f"Acces refuse pour le role: {request.user.role}")

class CategorieViewSet(viewsets.ModelViewSet):
    queryset = Categorie.objects.all()
    serializer_class = CategorieSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['nom', 'description']

    def list(self, request, *args, **kwargs): check_role(request, "ADMIN", "ACHETEUR", "MAGASINIER", "COMMERCIAL"); return super().list(request, *args, **kwargs)
    def create(self, request, *args, **kwargs): check_role(request, "ADMIN", "ACHETEUR"); return super().create(request, *args, **kwargs)
    def update(self, request, *args, **kwargs): check_role(request, "ADMIN", "ACHETEUR"); return super().update(request, *args, **kwargs)
    def destroy(self, request, *args, **kwargs): check_role(request, "ADMIN"); return super().destroy(request, *args, **kwargs)

class FournisseurViewSet(viewsets.ModelViewSet): # <-- VAOVAO
    queryset = Fournisseur.objects.all()
    serializer_class = FournisseurSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['nom', 'email']
    def list(self, request, *args, **kwargs): check_role(request, "ADMIN", "ACHETEUR", "MAGASINIER", "COMPTABLE"); return super().list(request, *args, **kwargs)

class BonCommandeViewSet(viewsets.ModelViewSet): # <-- VAOVAO
    queryset = BonCommande.objects.all().select_related('fournisseur', 'created_by').prefetch_related('lignes__produit').order_by("-created_at")
    serializer_class = BonCommandeSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['numero', 'fournisseur__nom', 'statut']

    def list(self, request, *args, **kwargs): check_role(request, "ADMIN", "ACHETEUR", "MAGASINIER", "COMPTABLE"); return super().list(request, *args, **kwargs)
    def create(self, request, *args, **kwargs): check_role(request, "ADMIN", "ACHETEUR"); request.data['created_by'] = request.user.id; return super().create(request, *args, **kwargs)
    def update(self, request, *args, **kwargs): check_role(request, "ADMIN", "ACHETEUR"); return super().update(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='receptionner')
    @transaction.atomic
    def receptionner(self, request, pk=None):
        """IO NY PONT: Rehefa receptionner dia miakatra ny Stock"""
        check_role(request, "ADMIN", "MAGASINIER", "ACHETEUR")
        bc = self.get_object()
        if bc.statut in ['RECU', 'ANNULER']: return Response({'error': 'Ce BC ne peut plus être réceptionné'}, status=status.HTTP_400_BAD_REQUEST)

        tout_recu = True
        for ligne in bc.lignes.all():
            qte_a_receptionner = ligne.quantite - ligne.quantite_recue
            if qte_a_receptionner > 0:
                # 1. CREER MOUVEMENT DANS TABLE STOCK. Ny serializer an'ny stock no mi-update ny Stock.quantite auto
                MouvementStock.objects.create(
                    produit=ligne.produit,
                    type='ENTREE_ACHAT',
                    quantite=qte_a_receptionner,
                    reference=bc.numero,
                    motif=f"Réception BC {bc.numero}",
                    fait_par=request.user
                )
                # 2. CREER AUSSI HISTORIQUE POUR L'AUDIT PRODUIT
                stock_avant = ligne.produit.stock
                HistoriqueStock.objects.create(
                    produit=ligne.produit, type_mouvement='ENTREE', quantite=qte_a_receptionner,
                    stock_avant=stock_avant, stock_apres=ligne.produit.stock,
                    user=request.user, motif=f"Réception BC {bc.numero}", reference=bc.numero
                )
                # 3. MAJ LIGNE BC
                ligne.quantite_recue += qte_a_receptionner
                ligne.save()
            if ligne.quantite_recue < ligne.quantite: tout_recu = False

        bc.statut = 'RECU' if tout_recu else 'PARTIEL'
        bc.save()
        return Response(BonCommandeSerializer(bc).data, status=status.HTTP_200_OK)

class ProduitViewSet(viewsets.ModelViewSet):
    queryset = Produit.objects.all().select_related('categorie', 'created_by').order_by("-created_at")
    serializer_class = ProduitSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    lookup_field = "id"
    filter_backends = [filters.SearchFilter]
    search_fields = ['code', 'designation', 'description']

    def get_queryset(self):
        qs = super().get_queryset()
        role = get_role(self.request)
        if self.action == 'list' and role == "COMMERCIAL":
            qs_filtre = qs.filter(Q(statut__iexact='ACTIF') & Q(is_active=True))
            return qs_filtre if qs_filtre.exists() else qs
        return qs

    def log_action(self, user, action, instance, changes={}):
        AuditLog.objects.create(
            user=user, user_role=user.role, action=action,
            target_model='Produit', target_id=instance.id,
            target_name=instance.designation, details={'changes': changes}
        )

    def list(self, request, *args, **kwargs): check_role(request, "ADMIN", "MAGASINIER", "ACHETEUR", "COMMERCIAL", "COMPTABLE"); return super().list(request, *args, **kwargs)
    def retrieve(self, request, *args, **kwargs): check_role(request, "ADMIN", "MAGASINIER", "ACHETEUR", "COMMERCIAL", "COMPTABLE"); return super().retrieve(request, *args, **kwargs)
    def create(self, request, *args, **kwargs):
        check_role(request, "ADMIN", "ACHETEUR")
        response = super().create(request, *args, **kwargs)
        if response.status_code == 201: self.log_action(request.user, 'CREATE', Produit.objects.get(id=response.data['id']))
        return response

    def update(self, request, *args, **kwargs):
        instance = self.get_object(); old_data = ProduitSerializer(instance).data; role = get_role(self.request); champs_envoyes = set(request.data.keys())
        if role == "ADMIN": pass
        elif role == "ACHETEUR":
            champs_autorises = {'code', 'designation', 'prix_achat', 'description', 'categorie'}
            if champs_envoyes - champs_autorises: raise PermissionDenied({"detail": "L'acheteur ne peut modifier que: code, designation, prix_achat, description, categorie"})
        elif role == "MAGASINIER":
            champs_autorises = {'prix_vente', 'stock_min', 'description', 'categorie', 'statut', 'is_active'}
            if champs_envoyes - champs_autorises: raise PermissionDenied({"detail": "Le magasinier ne peut modifier que: prix_vente, stock_min, description, categorie, statut, is_active"})
        elif role in ["COMMERCIAL", "COMPTABLE"]: raise PermissionDenied({"detail": f"Le role {role} n'a pas le droit de modifier un produit."})
        else: raise PermissionDenied("Role non reconnu.")
        kwargs['partial'] = True; response = super().update(request, *args, **kwargs)
        if response.status_code == 200:
            new_data = response.data; changes = {k: {'old': old_data[k], 'new': v} for k, v in new_data.items() if k in old_data and str(old_data[k])!= str(v)}
            if changes: self.log_action(request.user, 'UPDATE', instance, changes)
        return response

    def destroy(self, request, *args, **kwargs): check_role(request, "ADMIN"); instance = self.get_object(); self.log_action(request.user, 'DELETE', instance); return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'], url_path='audit-global')
    def audit_global(self, request): check_role(request, "ADMIN", "COMPTABLE"); logs = AuditLog.objects.filter(target_model='Produit').order_by('-timestamp'); page = self.paginate_queryset(logs); return self.get_paginated_response(AuditLogSerializer(page, many=True).data) if page else Response(AuditLogSerializer(logs, many=True).data)
    @action(detail=True, methods=['get'], url_path='audit')
    def audit_produit(self, request, id=None): check_role(request, "ADMIN", "COMPTABLE", "ACHETEUR"); logs = AuditLog.objects.filter(target_model='Produit', target_id=id).order_by('-timestamp'); page = self.paginate_queryset(logs); return self.get_paginated_response(AuditLogSerializer(page, many=True).data) if page else Response(AuditLogSerializer(logs, many=True).data)

    # TSY ILAIKA INTSONY IRETO 2 IRETO RAHA EFA MANAO RECEPTIONNER IANAO
    # Fa tavela raha te manao entree manuelle ianao
    @transaction.atomic
    @action(detail=False, methods=['post'], url_path='entree-stock')
    def entree_stock(self, request):
        check_role(request, "ADMIN", "MAGASINIER", "ACHETEUR")
        serializer = MouvementStockSerializer(data=request.data); serializer.is_valid(raise_exception=True); data = serializer.validated_data
        # IO NY VAOVAO: Mi-call ny app stock fa tsy mi-update ny produit.stock mivantana
        MouvementStock.objects.create(produit_id=data['produit_id'], type='ENTREE_MANUELLE', quantite=data['quantite'], motif=data.get('motif', 'Entrée de stock'), reference=data.get('reference', ''), fait_par=request.user)
        produit = Produit.objects.get(id=data['produit_id'])
        self.log_action(request.user, 'UPDATE', produit, {'stock': {'old': produit.stock, 'new': produit.stock}})
        return Response({"detail": "Entrée enregistrée"}, status=status.HTTP_201_CREATED)

    @transaction.atomic
    @action(detail=False, methods=['post'], url_path='sortie-stock')
    def sortie_stock(self, request):
        check_role(request, "ADMIN", "MAGASINIER")
        serializer = MouvementStockSerializer(data=request.data); serializer.is_valid(raise_exception=True); data = serializer.validated_data
        MouvementStock.objects.create(produit_id=data['produit_id'], type='SORTIE_MANUELLE', quantite=data['quantite'], motif=data.get('motif', 'Sortie de stock'), reference=data.get('reference', ''), fait_par=request.user)
        produit = Produit.objects.get(id=data['produit_id'])
        self.log_action(request.user, 'UPDATE', produit, {'stock': {'old': produit.stock, 'new': produit.stock}})
        return Response({"detail": "Sortie enregistrée"}, status=status.HTTP_201_CREATED)

class HistoriqueStockViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HistoriqueStock.objects.all().order_by('-date')
    serializer_class = HistoriqueStockSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    def get_queryset(self):
        qs = super().get_queryset()
        produit_id = self.request.query_params.get('produit')
        return qs.filter(produit_id=produit_id) if produit_id else qs
    def list(self, request, *args, **kwargs):
        check_role(request, "ADMIN", "MAGASINIER", "ACHETEUR", "COMPTABLE", "COMMERCIAL")
        return super().list(request, *args, **kwargs) 