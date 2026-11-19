from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.hashers import make_password
from rest_framework.pagination import PageNumberPagination
from .models import User, UserHistory, Permission, RolePermission
from .serializers import (
    UserSerializer,
    PermissionSerializer,
    RolePermissionSerializer
)
from users.permissions import IsAdmin, IsMagasinier




class FournisseurPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_permissions(self):

        if self.action in ["create", "destroy"]:
            return [
                IsAuthenticated(),
                IsAdmin()
            ]

        if self.action in ["update", "partial_update"]:

            if self.request.user.role == "ADMIN":
                return [
                    IsAuthenticated(),
                    IsAdmin()
                ]

            elif self.request.user.role == "MAGASINIER":
                return [
                    IsAuthenticated(),
                    IsMagasinier()
                ]

        return [
            IsAuthenticated()
        ]



    @action(detail=True, methods=["post"], url_path="activer")
    def activer(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save()

        return Response({
            "message": f"Utilisateur {user.username} activé."
        })

    @action(detail=True, methods=["post"], url_path="desactiver")
    def desactiver(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save()

        return Response({
            "message": f"Utilisateur {user.username} désactivé."
        })

    @action(detail=False, methods=["get"])
    def profile(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=["put"])
    def change_password(self, request):
        user = request.user

        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")

        if not user.check_password(old_password):
            return Response(
                {"error": "Ancien mot de passe incorrect"},
                status=400
            )

        user.set_password(new_password)
        user.save()

        return Response({
            "message": "Mot de passe modifié avec succès."
        })

    @action(detail=True, methods=["patch"])
    def toggle_active(self, request, pk=None):
        user = self.get_object()

        user.is_active = not user.is_active
        user.save()

        UserHistory.objects.create(
            user=request.user,
            action=f"Modification du statut de {user.username}"
        )

        return Response({
            "username": user.username,
            "is_active": user.is_active
        })

    @action(detail=True, methods=["put"])
    def reset_password(self, request, pk=None):
        user = self.get_object()

        password = request.data.get("password")

        if not password:
            return Response(
                {"error": "Le mot de passe est obligatoire."},
                status=400
            )

        user.password = make_password(password)
        user.save()

        UserHistory.objects.create(
            user=request.user,
            action=f"Réinitialisation du mot de passe de {user.username}"
        )

        return Response({
            "message": "Mot de passe réinitialisé."
        })

    @action(detail=False, methods=["get"])
    def history(self, request):
        histories = UserHistory.objects.all()

        data = [
            {
                "user": h.user.username,
                "action": h.action,
                "date": h.date,
            }
            for h in histories
        ]

        return Response(data)


class PermissionViewSet(viewsets.ModelViewSet):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


class RolePermissionViewSet(viewsets.ModelViewSet):
    queryset = RolePermission.objects.all()
    serializer_class = RolePermissionSerializer
    permission_classes = [IsAuthenticated, IsAdmin]