from rest_framework import viewsets, filters, status
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, BasePermission
from django.utils.dateparse import parse_date
from django.core.mail import EmailMessage
from django.conf import settings
from.models import Client, AuditLog
from.serializers import (
    ClientAdminSerializer, ClientComptableSerializer, ClientReadOnlySerializer,
    ClientCommercialSerializer, ClientMagasinierSerializer, AuditLogSerializer
)
from.permissions import IsAdmin, IsAcheteur, IsComptable, IsCommercial, IsMagasinier
from rest_framework.pagination import PageNumberPagination
import traceback

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

def log_action(request, action, target_obj=None, details={}):
    AuditLog.objects.create(
        user=request.user if request.user.is_authenticated else None,
        user_role=request.user.role if request.user.is_authenticated else 'ANONYME',
        action=action,
        target_model='Client' if target_obj else 'GENERAL',
        target_id=target_obj.id if target_obj else None,
        target_name=str(target_obj) if target_obj else 'LISTE_CLIENTS',
        details=details
    )

def get_client_changes(old_instance, new_data):
    changes = {}
    for field, new_value in new_data.items():
        if hasattr(old_instance, field):
            old_value = getattr(old_instance, field)
            if str(old_value)!= str(new_value):
                changes[field] = {"old": str(old_value), "new": str(new_value)}
    return changes

class CanEditClientFields(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        data = request.data
        if request.method in ['PUT', 'PATCH']:
            if user.role in ['ADMIN', 'ACHETEUR']:
                return True
            if user.role == 'COMPTABLE':
                allowed_fields = {'nif', 'stat', 'delai_paiement', 'plafond_credit', 'note', 'is_active'}
                return set(data.keys()).issubset(allowed_fields)
            if user.role == 'COMMERCIAL':
                allowed_fields = {'contact_nom', 'telephone', 'email', 'adresse', 'ville', 'note', 'delai_paiement'}
                return set(data.keys()).issubset(allowed_fields)
        return True

class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all().order_by('-date_creation')
    pagination_class = FournisseurPagination
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['ville', 'is_active']
    search_fields = ['code', 'raison_sociale', 'nif', 'telephone']
    ordering_fields = ['date_creation', 'raison_sociale']

    def get_serializer_class(self):
        user = self.request.user
        if user.role in ['ADMIN', 'ACHETEUR']:
            return ClientAdminSerializer
        elif user.role == 'COMPTABLE':
            return ClientComptableSerializer
        elif user.role == 'COMMERCIAL':
            return ClientCommercialSerializer
        elif user.role == 'MAGASINIER':
            return ClientMagasinierSerializer
        else:
            return ClientReadOnlySerializer

    def get_permissions(self):
        if self.action == 'create':
            permission_classes = [IsAdmin | IsAcheteur | IsCommercial]
        elif self.action in ['update', 'partial_update']:
            permission_classes = [IsAdmin | IsAcheteur | IsComptable | IsCommercial, CanEditClientFields]
        elif self.action == 'destroy':
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def list(self, request, *args, **kwargs):
        log_action(request, 'VIEW_CLIENT_LIST', details={'filters': request.GET.dict()})
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        client = self.get_object()
        log_action(request, 'VIEW_CLIENT', target_obj=client)
        return super().retrieve(request, *args, **kwargs)

    def perform_create(self, serializer):
        client = serializer.save()
        log_action(self.request, 'CREATE_CLIENT', target_obj=client, details={'data': serializer.data})

    def perform_update(self, serializer):
        old_instance = self.get_object()
        new_data = serializer.validated_data
        changes = get_client_changes(old_instance, new_data)
        client = serializer.save()
        if changes:
            log_action(self.request, 'UPDATE_CLIENT', target_obj=client, details={'changes': changes})

    def perform_destroy(self, instance):
        log_action(self.request, 'DELETE_CLIENT', target_obj=instance)
        instance.delete()

    # === EMAIL 1 CLIENT - VERSION ANTI 500 ===
    @action(detail=True, methods=['post'], url_path='send-email')
    def send_email(self, request, pk=None):
        client = self.get_object()
        email_dest = (client.email or '').strip()

        if not email_dest:
            return Response({'error': "Ce client n'a pas d'email"}, status=400)

        sujet = request.data.get('sujet', f'Information VOLA ALOA - {client.raison_sociale}')
        message_text = request.data.get('message', f'Bonjour {client.raison_sociale},\n\nMessage de VOLA ALOA.\n\nCordialement.')

        try:
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or getattr(settings, 'EMAIL_HOST_USER', 'noreply@volaaloa.mg')
            email = EmailMessage(
                subject=sujet,
                body=message_text,
                from_email=from_email,
                to=[email_dest],
            )
            email.send(fail_silently=False)
            log_action(request, 'SEND_EMAIL_CLIENT', target_obj=client, details={'to': email_dest, 'sujet': sujet})
            return Response({'success': True, 'email_envoye_a': email_dest})
        except Exception as e:
            print("=== EMAIL ERROR ===")
            traceback.print_exc()
            return Response({'error': f"{type(e).__name__}: {str(e)}"}, status=500)

    # === EMAIL MULTIPLE - PLUSIEURS EMAILS ISANKARAZANY ===
    @action(detail=False, methods=['post'], url_path='send-bulk-email')
    def send_bulk_email(self, request):
        client_ids = request.data.get('client_ids', [])
        sujet = request.data.get('sujet', 'Information VOLA ALOA')
        message_text = request.data.get('message', 'Bonjour,\n\nMessage de VOLA ALOA')

        if not client_ids:
            return Response({'error': 'Aucun client sélectionné'}, status=400)

        clients = Client.objects.filter(id__in=client_ids).exclude(email__isnull=True).exclude(email='')
        dests = [c.email.strip() for c in clients if c.email]

        if not dests:
            return Response({'error': 'Aucun email valide'}, status=400)

        envoyes = []
        erreurs = []
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or getattr(settings, 'EMAIL_HOST_USER', 'noreply@volaaloa.mg')

        for email_dest in set(dests):
            try:
                EmailMessage(subject=sujet, body=message_text, from_email=from_email, to=[email_dest]).send()
                envoyes.append(email_dest)
            except Exception as e:
                erreurs.append(f"{email_dest}: {str(e)}")

        log_action(request, 'SEND_BULK_EMAIL', details={'envoyes': envoyes, 'erreurs': erreurs})
        return Response({'success': True, 'message': f'{len(envoyes)}/{len(set(dests))} envoyés', 'envoyes': envoyes, 'erreurs': erreurs})

    @action(detail=True, methods=['get'], permission_classes=[IsAdmin])
    def audit(self, request, pk=None):
        client = self.get_object()
        logs = AuditLog.objects.filter(target_model='Client', target_id=client.id).order_by('-timestamp')
        date_after = request.query_params.get('date_after')
        date_before = request.query_params.get('date_before')
        if date_after:
            logs = logs.filter(timestamp__date__gte=parse_date(date_after))
        if date_before:
            logs = logs.filter(timestamp__date__lte=parse_date(date_before))
        return self.paginate_and_respond_logs(request, logs)

    @action(detail=False, methods=['get'], url_path='audit-logs', permission_classes=[IsAdmin])
    def audit_logs(self, request):
        logs = AuditLog.objects.filter(target_model='Client').order_by('-timestamp')
        date_after = request.query_params.get('date_after')
        date_before = request.query_params.get('date_before')
        if date_after:
            logs = logs.filter(timestamp__date__gte=parse_date(date_after))
        if date_before:
            logs = logs.filter(timestamp__date__lte=parse_date(date_before))
        return self.paginate_and_respond_logs(request, logs)

    def paginate_and_respond_logs(self, request, logs):
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(logs, request)
        if page is not None:
            serializer = AuditLogSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        serializer = AuditLogSerializer(logs, many=True)
        return Response(serializer.data)