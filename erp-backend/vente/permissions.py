from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsAdminOrCommercial(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['ADMIN', 'COMMERCIAL']

class IsAdminOrMagasinier(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['ADMIN', 'MAGASINIER']

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'ADMIN'

class VentePermission(BasePermission):
    """GET: ADMIN, COMPTABLE, MAGASINIER, COMMERCIAL | POST/PUT/DELETE: ADMIN, COMPTABLE"""
    def has_permission(self, request, view):
        if not request.user.is_authenticated: return False
        role = request.user.role
        allowed_read = ['ADMIN', 'COMPTABLE', 'MAGASINIER', 'COMMERCIAL']
        allowed_write = ['ADMIN', 'COMPTABLE']
        if request.method in SAFE_METHODS: return role in allowed_read
        return role in allowed_write