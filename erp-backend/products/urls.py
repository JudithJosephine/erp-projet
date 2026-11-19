from rest_framework.routers import DefaultRouter
from.views import ProduitViewSet
from.views import HistoriqueStockViewSet
from.views import CategorieViewSet
from django.urls import path, include


router = DefaultRouter()
router.register(r'produits', ProduitViewSet, basename='produit')
router.register(r'categories', CategorieViewSet, basename='categorie')
router.register(r'historique-stock', HistoriqueStockViewSet, basename='historique-stock')

urlpatterns = [
    path('', include(router.urls))
]
