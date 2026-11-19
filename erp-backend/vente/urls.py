from rest_framework.routers import DefaultRouter
from .views import *


router = DefaultRouter()
router.register(r'devis-client', DevisClientViewSet)
router.register(r'commande-client', CommandeClientViewSet)
router.register(r'bon-livraison', BonLivraisonViewSet)
router.register(r'chauffeurs', ChauffeurViewSet, basename='chauffeur')
router.register(r'facture-client', FactureClientViewSet)
router.register(r'paiement-client', PaiementClientViewSet)

urlpatterns = router.urls

