from rest_framework import serializers
from .models import Stock, MouvementStock, TYPE_MOUVEMENT
from products.serializers import ProduitSerializer
from.models import Inventaire, LigneInventaire
from products.models import Produit


class StockSerializer(serializers.ModelSerializer):
    produit_detail = ProduitSerializer(source='produit', read_only=True)
    produit_designation = serializers.CharField(source='produit.designation', read_only=True)
    produit_reference = serializers.CharField(source='produit.code', read_only=True) 
    en_alerte = serializers.BooleanField(read_only=True)
    class Meta:
        model = Stock
        fields = ['id', 'produit', 'produit_detail', 'produit_designation', 'produit_reference', 'quantite', 'seuil_alerte', 'en_alerte', 'updated_at']
        read_only_fields = ['quantite', 'updated_at', 'en_alerte']
        
class MouvementStockSerializer(serializers.ModelSerializer):
    produit_designation = serializers.CharField(source='produit.designation', read_only=True)
    fait_par_nom = serializers.CharField(source='fait_par.username', read_only=True)
    class Meta:
        model = MouvementStock
        fields = ['id', 'produit', 'produit_designation', 'type', 'quantite', 'motif', 'reference', 'date_mouvement', 'fait_par_nom']
        read_only_fields = ['fait_par', 'date_mouvement', 'produit_designation', 'fait_par_nom']
    def validate(self, data):
        if data['quantite'] <= 0: raise serializers.ValidationError("La quantité doit être supérieure à 0")
        return data
    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated: validated_data['fait_par'] = request.user
        return super().create(validated_data)

class LigneInventaireSerializer(serializers.ModelSerializer):
    produit_nom = serializers.CharField(source='produit.designation', read_only=True)
    produit_reference = serializers.CharField(source='produit.code', read_only=True) 
    produit = serializers.IntegerField(source='produit.id', read_only=True)
    class Meta:
        model = LigneInventaire
        fields = ['id', 'produit', 'produit_nom', 'produit_reference', 'stock_theorique', 'stock_reel', 'ecart']
        read_only_fields = ['ecart', 'stock_theorique']

class InventaireSerializer(serializers.ModelSerializer):
    lignes = LigneInventaireSerializer(many=True, read_only=True)
    cree_par_nom = serializers.CharField(source='cree_par.username', read_only=True)
    valide_par_nom = serializers.CharField(source='valide_par.username', read_only=True)
    class Meta:
        model = Inventaire
        fields = ['id', 'date_debut', 'date_fin', 'statut', 'cree_par_nom', 'valide_par_nom', 'lignes']