from rest_framework.routers import DefaultRouter
from.views import IAViewSet

router = DefaultRouter()
router.register(r'', IAViewSet, basename='ia')
urlpatterns = router.urls