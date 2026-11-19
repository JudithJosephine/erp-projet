from rest_framework.routers import DefaultRouter
from.views import StockViewSet, MouvementStockViewSet,InventaireViewSet

router = DefaultRouter()
router.register(r'stocks', StockViewSet, basename='stock')
router.register(r'mouvements-stock', MouvementStockViewSet, basename='mouvement-stock')
router.register(r'inventaires', InventaireViewSet, basename='inventaire')
urlpatterns = router.urls