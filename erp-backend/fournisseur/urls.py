from rest_framework.routers import DefaultRouter
from.views import FournisseurViewSet
from django.urls import path, include
from.views import me



router = DefaultRouter()
router.register(r'fournisseur', FournisseurViewSet, basename='fournisseur')

urlpatterns = [
    path('', include(router.urls)),
    path('me/', me), 
]
