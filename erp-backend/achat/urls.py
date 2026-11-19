from rest_framework.routers import DefaultRouter
from django.urls import path, include
from.views import *

router = DefaultRouter()
router.register(r'demandes-achat', DemandeAchatViewSet, basename='demandeachat')
router.register(r'demandes-prix', DemandePrixViewSet, basename='demandeprix')
router.register(r'lignes-demande-prix',LigneDemandePrixViewSet,basename='lignedemandeprix')
router.register(r'achat', AchatViewSet, basename='achat')
router.register(r'retours', RetourFournisseurViewSet, basename='retour')
router.register(r'factures', FactureFournisseurViewSet, basename='facture')
router.register(r'paiements', PaiementFournisseurViewSet, basename='paiement')
router.register(r'receptions', ReceptionViewSet, basename='reception')



urlpatterns = [
    path('', include(router.urls)),
    path('demandes-prix-create/', DemandePrixCreateView.as_view(), name='demandes-prix-create'), # AMPIO ITO
]