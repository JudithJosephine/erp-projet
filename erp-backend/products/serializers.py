from rest_framework import serializers
from.models import BonCommande, Fournisseur, LigneBonCommande, Produit, Categorie, HistoriqueStock, AuditLog

class CategorieSerializer(serializers.ModelSerializer):
    nb_produits = serializers.SerializerMethodField()

    class Meta:
        model = Categorie
        fields = ['id', 'nom', 'description', 'created_at', 'nb_produits']
        read_only_fields = ['created_at']

    def get_nb_produits(self, obj):
        return obj.produits.filter(is_active=True).count()

class ProduitSerializer(serializers.ModelSerializer):
    categorie_nom = serializers.CharField(source='categorie.nom', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    stock = serializers.ReadOnlyField() 
    

    class Meta:
        model = Produit
        fields = [
            'id', 'code', 'designation', 'description',
            'prix_achat', 'prix_vente',
            'categorie', 'categorie_nom', 
            'is_active', 'statut', 'created_by', 'created_by_username',
            'created_at', 'updated_at', 'stock', 'stock_min' # <-- nampiana stock sy stock_min
        ]
        read_only_fields = ["created_at", "updated_at", "created_by", "stock"] # <-- stock = read_only

    def validate_categorie(self, value): 
        if value in ["", None, "null"]:
            return None
        return value

    def create(self, validated_data):
        request = self.context.get("request")
        if request:
            validated_data['created_by'] = request.user
            if request.user.role != "ADMIN":
                validated_data['statut'] = 'BROUILLON'
        return super().create(validated_data)

    def update(self, instance, validated_data):
        return super().update(instance, validated_data)

    def validate_prix_vente(self, value):
        if value < 0: raise serializers.ValidationError("Le prix de vente ne peut pas être négatif.")
        return value

    def validate_prix_achat(self, value):
        if value < 0: raise serializers.ValidationError("Le prix d'achat ne peut pas être négatif.")
        return value

class MouvementStockSerializer(serializers.Serializer):
    produit_id = serializers.IntegerField()
    quantite = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0.01) # <-- OVANA: Decimal
    motif = serializers.CharField(max_length=100, required=False, default="Mouvement")
    reference = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate_produit_id(self, value):
        if not Produit.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("Produit introuvable ou inactif.")
        return value

class HistoriqueStockSerializer(serializers.ModelSerializer):
    produit_designation = serializers.CharField(source='produit.designation', read_only=True)
    produit_code = serializers.CharField(source='produit.code', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True, default='Systeme')

    class Meta:
        model = HistoriqueStock
        fields = [
            'id', 'produit', 'produit_code', 'produit_designation',
            'type_mouvement', 'quantite', 'stock_avant', 'stock_apres',
            'user', 'user_username', 'date', 'motif', 'reference'
        ]
        read_only_fields = ['date', 'stock_avant', 'stock_apres', 'user']

class AuditLogSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True, default='Anonyme')
    class Meta:
        model = AuditLog
        fields = ['id','user','user_username','user_role','action','target_model','target_id','target_name','details','timestamp']
        read_only_fields = ['timestamp']
        
class LigneBonCommandeSerializer(serializers.ModelSerializer):
    produit_designation = serializers.CharField(source='produit.designation', read_only=True)
    montant = serializers.ReadOnlyField()

    class Meta:
        model = LigneBonCommande
        fields = ['id', 'produit', 'produit_designation', 'quantite', 'prix_unitaire', 'quantite_recue', 'montant']

class BonCommandeSerializer(serializers.ModelSerializer):
    lignes = LigneBonCommandeSerializer(many=True)
    fournisseur_nom = serializers.CharField(source='fournisseur.nom', read_only=True)

    class Meta:
        model = BonCommande
        fields = ['id', 'numero', 'fournisseur', 'fournisseur_nom', 'date_commande', 'statut', 'created_by', 'created_at', 'lignes']
        read_only_fields = ['created_by', 'created_at']

    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes')
        bc = BonCommande.objects.create(**validated_data)
        for ligne_data in lignes_data:
            LigneBonCommande.objects.create(bon_commande=bc, **ligne_data)
        return bc

class FournisseurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fournisseur
        fields = '__all__'