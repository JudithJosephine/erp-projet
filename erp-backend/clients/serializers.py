from rest_framework import serializers
from .models import Client, AuditLog

class ClientAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = '__all__'
        read_only_fields = ['id','code','date_creation','updated_at']

class ClientComptableSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ['id','code','raison_sociale','nif','stat','delai_paiement','plafond_credit','note','is_active']
        read_only_fields = ['id','code','raison_sociale']

class ClientCommercialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ['id','code','raison_sociale','contact_nom','telephone','email','adresse','ville','note','delai_paiement']
        read_only_fields = ['id','code','raison_sociale']

class ClientMagasinierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ['id','code','raison_sociale','contact_nom','telephone','adresse','ville']
        read_only_fields = '__all__'

class ClientReadOnlySerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ['id','code','raison_sociale','contact_nom','email','telephone','adresse','ville','nif','stat','delai_paiement','note','is_active','date_creation','updated_at']
        read_only_fields = '__all__'

# AJOUTE CA : Alias pour utiliser dans Vente et autres apps
class ClientSerializer(ClientReadOnlySerializer):
    """
    Serializer général pour les relations FK. 
    Utilise ClientReadOnlySerializer par défaut.
    """
    pass

class AuditLogSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'timestamp', 'user_username', 'user_role', 'action', 'target_model', 'target_id', 'target_name', 'details']
        read_only_fields = '__all__'