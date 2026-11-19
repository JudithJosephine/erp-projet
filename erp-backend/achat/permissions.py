from rest_framework.permissions import BasePermission

# ==========================================
# ADMIN
# ==========================================
class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and str(getattr(request.user, 'role', '')).upper() == "ADMIN"

# ==========================================
# ACHETEUR - ACHETEUR IHANY, TSY MISY ADMIN
# ==========================================
class IsAcheteur(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and str(getattr(request.user, 'role', '')).upper() == "ACHETEUR"

# ==========================================
# MAGASINIER
# ==========================================
class IsMagasinier(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and str(getattr(request.user, 'role', '')).upper() in ["MAGASINIER", "ADMIN"]

# ==========================================
# COMPTABLE
# ==========================================
class IsComptable(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and str(getattr(request.user, 'role', '')).upper() in ["COMPTABLE", "ADMIN"]

# ==========================================
# COMMERCIAL
# ==========================================
class IsCommercial(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and str(getattr(request.user, 'role', '')).upper() in ["COMMERCIAL", "ADMIN"]

# ==========================================
# COMBINAISONS - IREO NO NAFARANAO TEO
# ==========================================
class IsAdminOrMagasinier(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and str(getattr(request.user, 'role', '')).upper() in ["ADMIN", "MAGASINIER"]

class IsAcheteurOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and str(getattr(request.user, 'role', '')).upper() in ["ACHETEUR", "ADMIN"]

# ==========================================
# ACHAT (lecture)
# ==========================================
class AchatPermission(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        return True