from rest_framework import viewsets, filters
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, action # <-- nampiana action
from rest_framework.permissions import IsAuthenticated, BasePermission # <-- nampiana BasePermission
from django.utils.dateparse import parse_date # <-- nampiana
from.models import Fournisseur, AuditLog # <-- nampiana AuditLog
from.serializers import (
    FournisseurAdminSerializer, FournisseurComptableSerializer,
    FournisseurReadOnlySerializer, FournisseurCommercialSerializer,
    FournisseurMagasinierSerializer, AuditLogSerializer # <-- nampiana AuditLogSerializer
)
from.permissions import FournisseurPermission, IsAdmin, IsAcheteur, IsComptable, IsCommercial # <-- nampiana
from rest_framework.pagination import PageNumberPagination

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    user = request.user
    return Response({
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "email": user.email
    })

class FournisseurPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

# === VAOVAO 1: Fonction log ===
def log_action(request, action, target_obj=None, details={}):
    AuditLog.objects.create(
        user=request.user if request.user.is_authenticated else None,
        user_role=request.user.role if request.user.is_authenticated else 'ANONYME',
        action=action,
        target_model='Fournisseur' if target_obj else 'GENERAL',
        target_id=target_obj.id if target_obj else None,
        target_name=str(target_obj) if target_obj else 'LISTE_FOURNISSEURS',
        details=details
    )

# === VAOVAO 2: Fonction mba hahitana ny changements ===
def get_fournisseur_changes(old_instance, new_data):
    changes = {}
    for field, new_value in new_data.items():
        if hasattr(old_instance, field):
            old_value = getattr(old_instance, field)
            if str(old_value)!= str(new_value):
                changes[field] = {"old": str(old_value), "new": str(new_value)}
    return changes

# === VAOVAO 3: Permission mba hanamarina ny champ ===
class CanEditFournisseurFields(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        data = request.data
        if request.method in ['PUT', 'PATCH']:
            if user.role in ['ADMIN', 'ACHETEUR']: return True
            if user.role == 'COMPTABLE':
                allowed_fields = {'nif', 'stat', 'delai_paiement', 'note', 'is_active'}
                return set(data.keys()).issubset(allowed_fields)
            if user.role == 'COMMERCIAL':
                allowed_fields = {'contact_nom', 'telephone', 'email', 'adresse', 'ville', 'note'}
                return set(data.keys()).issubset(allowed_fields)
        return True

class FournisseurViewSet(viewsets.ModelViewSet):
    queryset = Fournisseur.objects.all().order_by('-date_creation')
    pagination_class = FournisseurPagination
    permission_classes = [IsAuthenticated, FournisseurPermission]
    filter_backends = [filters.SearchFilter]
    search_fields = ['code', 'raison_sociale', 'contact_nom', 'ville', 'nif']

    def get_serializer_class(self):
        user = self.request.user
        if user.role in ['ADMIN', 'ACHETEUR']:
            return FournisseurAdminSerializer
        elif user.role == 'COMPTABLE':
            return FournisseurComptableSerializer
        elif user.role == 'COMMERCIAL':
            return FournisseurCommercialSerializer
        elif user.role == 'MAGASINIER':
            return FournisseurMagasinierSerializer
        else:
            return FournisseurReadOnlySerializer

    # === VAOVAO 4: Manao log rehefa mijery liste ===
    def list(self, request, *args, **kwargs):
        log_action(request, 'VIEW_FOURNISSEUR_LIST', details={'filters': request.GET.dict()})
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        fournisseur = self.get_object()
        log_action(request, 'VIEW_FOURNISSEUR', target_obj=fournisseur)
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        print("ROLE:", request.user.role)
        print("DATA RECU:", request.data)
        response = super().create(request, *args, **kwargs)
        log_action(request, 'CREATE_FOURNISSEUR', target_obj=Fournisseur.objects.get(id=response.data['id']), details={'data': response.data})
        return response

    def update(self, request, *args, **kwargs):
        print("UPDATE ROLE:", request.user.role)
        old_instance = self.get_object()
        response = super().update(request, *args, **kwargs)
        new_instance = self.get_object()
        changes = get_fournisseur_changes(old_instance, request.data)
        if changes:
            log_action(request, 'UPDATE_FOURNISSEUR', target_obj=new_instance, details={'changes': changes})
        return response

    def destroy(self, request, *args, **kwargs):
        print("DELETE ROLE:", request.user.role)
        instance = self.get_object()
        log_action(request, 'DELETE_FOURNISSEUR', target_obj=instance)
        return super().destroy(request, *args, **kwargs)

    # === VAOVAO 5: HISTORIQUE PAR FOURNISSEUR ===
    @action(detail=True, methods=['get'], permission_classes=[IsAdmin])
    def audit(self, request, pk=None):
        fournisseur = self.get_object()
        logs = AuditLog.objects.filter(target_model='Fournisseur', target_id=fournisseur.id).order_by('-timestamp')

        date_after = request.query_params.get('date_after')
        date_before = request.query_params.get('date_before')
        if date_after: logs = logs.filter(timestamp__date__gte=parse_date(date_after))
        if date_before: logs = logs.filter(timestamp__date__lte=parse_date(date_before))

        return self.paginate_and_respond_logs(request, logs)

    # === VAOVAO 6: HISTORIQUE GLOBAL FOURNISSEUR ===
    @action(detail=False, methods=['get'], url_path='audit-logs', permission_classes=[IsAdmin])
    def audit_logs(self, request):
        logs = AuditLog.objects.filter(target_model='Fournisseur').order_by('-timestamp')

        date_after = request.query_params.get('date_after')
        date_before = request.query_params.get('date_before')
        if date_after: logs = logs.filter(timestamp__date__gte=parse_date(date_after))
        if date_before: logs = logs.filter(timestamp__date__lte=parse_date(date_before))

        return self.paginate_and_respond_logs(request, logs)

    # === FUNCTION ITSEFA ===
    def paginate_and_respond_logs(self, request, logs):
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(logs, request)
        if page is not None:
            serializer = AuditLogSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        serializer = AuditLogSerializer(logs, many=True)
        return Response(serializer.data)