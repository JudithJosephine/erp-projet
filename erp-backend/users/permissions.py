from rest_framework.permissions import BasePermission
from.models import RolePermission

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        print("=== DEBUG PERMISSION ===")
        print("User:", request.user)
        print("Role:", request.user.role)
        print("IsSuper:", request.user.is_superuser)
        print("========================")
        return request.user.is_authenticated and (request.user.role == "ADMIN" or request.user.is_superuser)

class IsAdminOrSelf(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role == "ADMIN":
            return True
        return obj.id == request.user.id

class HasRolePermission(BasePermission):
    """
    ADMIN et Superuser ont toujours accès
    Les autres roles doivent avoir la permission en DB
    """
    def has_permission(self, request, view):
        # 1. ADMIN passe toujours
        if request.user.is_authenticated and (request.user.role == "ADMIN" or request.user.is_superuser):
            return True

        # 2. Sinon on verifie la DB
        required_permission = getattr(view, "permission_code", None)
        if not required_permission:
            return True

        return RolePermission.objects.filter(
            role=request.user.role,
            permission__code=required_permission
        ).exists()

class IsMagasinier(BasePermission):
    message = "Seul prix_vente et stock_min sont modifiables."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "MAGASINIER"
        )