from rest_framework.routers import DefaultRouter
from.views import ReglementClientViewSet, ReglementFournisseurViewSet

router = DefaultRouter()
router.register(r'reglements-client', ReglementClientViewSet)
router.register(r'reglements-fournisseur', ReglementFournisseurViewSet)

urlpatterns = router.urls