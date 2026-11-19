from rest_framework import serializers
from .models import Fournisseur, AuditLog
from django.contrib.auth import get_user_model

User = get_user_model()


class FournisseurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fournisseur
        fields = '__all__'
class FournisseurAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fournisseur
        fields = '__all__'
        read_only_fields = ['id','date_creation','updated_at']

class FournisseurComptableSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fournisseur
        fields = [
            'id','code','raison_sociale','nif','stat','delai_paiement','email','telephone','adresse','ville','date_creation'
        ]
        read_only_fields = ['id','code','raison_sociale','date_creation']
        
class FournisseurCommercialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fournisseur
        fields = [
            'id','code','raison_sociale','contact_nom','telephone','email','adresse','ville','note','delai_paiement'
        ]
        read_only_fields = ['id','code','raison_sociale']
        
class FournisseurMagasinierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fournisseur
        fields = [
            'id','code','raison_sociale','contact_nom','telephone','adresse','ville'
        ]
        read_only_fields = ['id','code','raison_sociale','telephone','adresse','ville']
        
class FournisseurReadOnlySerializer(serializers.ModelSerializer):
    class Meta:
        model = Fournisseur
        fields = [
            'id','code','raison_sociale','contact_nom','email','telephone','adresse','ville','nif','stat','delai_paiement','note','is_active','date_creation','updated_at'
        ]
        read_only_fields = ['id','code','raison_sociale','contact_nom','email','telephone','adresse','ville','nif','stat','delai_paiement','note','is_active','date_creation','updated_at'] # <-- CORRECTED

# === AUDIT LOG SERIALIZER ===
class UserSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role']

class AuditLogSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True, default='Anonyme')
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 
            'user', 
            'user_username',
            'user_role', 
            'action', 
            'target_model', 
            'target_id', 
            'target_name', 
            'details', 
            'timestamp'
        ]
        read_only_fields = ['id','user','user_role','action','target_model','target_id','target_name','details','timestamp'] # <-- CORRECTED