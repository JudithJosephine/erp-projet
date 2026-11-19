from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('users.urls')),
    path('api/', include('products.urls')),
    path('api/', include('fournisseur.urls')),
    path('api/', include('clients.urls')),
    path('api/', include('achat.urls')),
    path('api/', include('stock.urls')),
    path('api/', include('vente.urls')),
    path('api/pilotage/', include('pilotage.urls')),
    path('api/', include('reglement.urls')),
    path('api/ia/', include('ia.urls')), 
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

# ITO NO NALAINA NIALA - TSY MISY INDENT
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)