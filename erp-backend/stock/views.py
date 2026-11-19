# views.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from django.db.models import F, Sum
from.models import Stock, MouvementStock, Inventaire, LigneInventaire
from.serializers import StockSerializer, MouvementStockSerializer, InventaireSerializer, LigneInventaireSerializer
from products.models import Produit

class IsAdminOrMagasinier(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['ADMIN', 'MAGASINIER']

class StockViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Stock.objects.select_related('produit').all()
    serializer_class = StockSerializer
    permission_classes = [IsAuthenticated]

class MouvementStockViewSet(viewsets.ModelViewSet):
    queryset = MouvementStock.objects.select_related('produit', 'fait_par').all()
    serializer_class = MouvementStockSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        queryset = super().get_queryset()
        produit_id = self.request.query_params.get('produit')
        if produit_id:
            queryset = queryset.filter(produit_id=produit_id)
        return queryset

class InventaireViewSet(viewsets.ModelViewSet):
    queryset = Inventaire.objects.all().prefetch_related('lignes__produit')
    serializer_class = InventaireSerializer
    permission_classes = [IsAuthenticated]
    @action(detail=False, methods=['post'], permission_classes=[IsAdminOrMagasinier])
    def demarrer(self, request):
        Inventaire.objects.filter(statut='EN_COURS').update(statut='ANNULE', date_fin=timezone.now())
        with transaction.atomic():
            inventaire = Inventaire.objects.create(statut='EN_COURS', cree_par=request.user)
            produits = Produit.objects.filter(is_active=True) 
            lignes = []
            for p in produits:
                qte_stock = Stock.objects.filter(produit=p).aggregate(total=Sum('quantite'))['total'] or Decimal('0')
                lignes.append(
                    LigneInventaire(
                        inventaire=inventaire,
                        produit=p,
                        stock_theorique=qte_stock 
                    )
                )
            LigneInventaire.objects.bulk_create(lignes, batch_size=500)
        return Response(self.get_serializer(inventaire).data, status=status.HTTP_201_CREATED)
    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrMagasinier])
    def annuler(self, request, pk=None):
        inventaire = self.get_object()
        if inventaire.statut!= 'EN_COURS':
            return Response({'error': 'Seul un inventaire en cours peut être annulé'}, status=400)
        inventaire.statut = 'ANNULE'
        inventaire.date_fin = timezone.now()
        inventaire.save()
        return Response({'success': 'Inventaire annulé'})
    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrMagasinier])
    @transaction.atomic
    def valider(self, request, pk=None):
        inventaire = self.get_object()
        if inventaire.statut!= 'EN_COURS':
            return Response({'error': 'Cet inventaire est déjà validé'}, status=400)
        produits_corriges = 0
        for ligne in inventaire.lignes.exclude(stock_reel=F('stock_theorique')):
            stock_obj, _ = Stock.objects.get_or_create(produit=ligne.produit)
            stock_obj.quantite = ligne.stock_reel
            stock_obj.save()
            ecart = ligne.stock_reel - ligne.stock_theorique
            if ecart!= 0:
                MouvementStock.objects.create(
                    produit=ligne.produit,
                    type='AJUSTEMENT',
                    quantite=abs(ecart),
                    reference=f'INV-{inventaire.id}',
                    fait_par=request.user,
                    motif=f'Ecart inventaire: {ecart}'
                )
                produits_corriges += 1
        inventaire.statut = 'VALIDE'
        inventaire.date_fin = timezone.now()
        inventaire.valide_par = request.user
        inventaire.save()
        return Response({'success': f'Inventaire validé. {produits_corriges} produits corrigés'})
    @action(detail=True, methods=['patch'], permission_classes=[IsAdminOrMagasinier])
    def update_ligne(self, request, pk=None):
        inventaire = self.get_object()
        produit_id = request.data.get('produit_id')
        stock_reel = request.data.get('stock_reel')
        try:
            ligne = inventaire.lignes.get(produit_id=produit_id)
        except LigneInventaire.DoesNotExist:
            return Response({'error': 'Ligne non trouvée'}, status=404)
        ligne.stock_reel = Decimal(str(stock_reel))
        ligne.save() 
        serializer = LigneInventaireSerializer(ligne)
        return Response(serializer.data)