from rest_framework import permissions

class FournisseurPermission(permissions.BasePermission):

    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False

        # GET autorisé pour tous les utilisateurs connectés
        if request.method == "GET":
            return True

        if request.method == "DELETE":
            return user.role == "ADMIN"

        # Création
        if request.method == "POST":
            return user.role in ["ADMIN", "ACHETEUR"]

        # Modification
        if request.method in ["PUT","PATCH"]:
            sent_fields = set(request.data.keys())

            # 1. ADMIN et ACHETEUR peuvent modifier tout
            if user.role in ["ADMIN", "ACHETEUR"]:
                return True

            # 2. COMPTABLE seulement les infos comptables
            if user.role == "COMPTABLE":
                allowed_fields = {"nif","stat","delai_paiement","note","is_active"}
                return sent_fields.issubset(allowed_fields)

            # 3. COMMERCIAL seulement les infos contact
            if user.role == "COMMERCIAL":
                allowed_fields = {"contact_nom","telephone","email","adresse","ville","note","delai_paiement"}
                return sent_fields.issubset(allowed_fields)

        return False

# === IRETO NO NAMPITSA NY ERREUR ===
# Ireo no ampiasaina ao @action(permission_classes=[IsAdmin])
class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'ADMIN'

class IsAcheteur(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'ACHETEUR'

class IsComptable(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'COMPTABLE'

class IsCommercial(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'COMMERCIAL'

class IsMagasinier(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'MAGASINIER'