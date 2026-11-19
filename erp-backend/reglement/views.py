from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from.models import ReglementClient, ReglementFournisseur,FactureFournisseur
from.serializers import ReglementClientSerializer, ReglementFournisseurSerializer
from achat.serializers import FactureFournisseurPourPaiementSerializer
from vente.permissions import VentePermission
from achat.permissions import AchatPermission

class ReglementClientViewSet(viewsets.ModelViewSet):
    queryset = ReglementClient.objects.select_related('facture', 'cree_par').all()
    serializer_class = ReglementClientSerializer
    permission_classes = [VentePermission]
    def get_queryset(self):
        queryset = super().get_queryset()
        facture_id = self.request.query_params.get('facture')
        if facture_id: queryset = queryset.filter(facture_id=facture_id)
        return queryset

class ReglementFournisseurViewSet(viewsets.ModelViewSet):
    # AMPITSIHO IZAO: mba hisintona ny achat sy fournisseur
    queryset = ReglementFournisseur.objects.select_related('facture__achat__fournisseur', 'cree_par').all()
    serializer_class = ReglementFournisseurSerializer
    permission_classes = [AchatPermission]

    def get_queryset(self):
        queryset = super().get_queryset()
        facture_id = self.request.query_params.get('facture')
        if facture_id: queryset = queryset.filter(facture_id=facture_id)
        return queryset