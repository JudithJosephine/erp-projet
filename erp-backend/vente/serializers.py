from rest_framework import serializers
from django.db import transaction
from decimal import Decimal
from datetime import date, timedelta
from django.db import models # <-- NAMPINA IZAO
from .models import *
from .models import Chauffeur

class DevisClientLigneSerializer(serializers.ModelSerializer):
    class Meta: model = DevisClientLigne; fields = '__all__'; read_only_fields = ['total_ht', 'total_ttc', 'devis']

class DevisClientStatutSerializer(serializers.ModelSerializer):
    class Meta: model = DevisClient; fields = ['statut']

class DevisClientCommercialSerializer(serializers.ModelSerializer):
    lignes = DevisClientLigneSerializer(many=True); client_nom = serializers.CharField(source='client.contact_nom', read_only=True)
    class Meta: model = DevisClient; fields = ['id', 'numero', 'client', 'client_nom', 'date_devis', 'date_validite', 'statut', 'total_ht', 'total_tva', 'total_ttc', 'lignes']; read_only_fields = ['numero', 'commercial', 'client_nom', 'total_ht', 'total_tva', 'total_ttc', 'statut']
    @transaction.atomic
    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes', []); validated_data['commercial'] = self.context['request'].user; devis = DevisClient.objects.create(**validated_data)
        total_ht, total_tva = Decimal(0), Decimal(0)
        for ligne in lignes_data: 
            q = Decimal(ligne['quantite']); pu = Decimal(ligne['prix_unitaire_ht']); r = Decimal(ligne.get('remise', 0)); t = Decimal(ligne.get('tva', 20))
            ht = q * pu * (Decimal(1) - r / Decimal(100)); tva_montant = ht * (t / Decimal(100))
            DevisClientLigne.objects.create(devis=devis, total_ht=ht, total_ttc=ht+tva_montant, **ligne)
            total_ht += ht; total_tva += tva_montant
        devis.total_ht = total_ht; devis.total_tva = total_tva; devis.total_ttc = total_ht + total_tva; devis.save(); return devis
    @transaction.atomic
    def update(self, instance, validated_data):
        lignes_data = validated_data.pop('lignes', None)
        if lignes_data is not None:
            instance.lignes.all().delete(); total_ht, total_tva = Decimal(0), Decimal(0)
            for ligne in lignes_data: 
                q = Decimal(ligne['quantite']); pu = Decimal(ligne['prix_unitaire_ht']); r = Decimal(ligne.get('remise', 0)); t = Decimal(ligne.get('tva', 20))
                ht = q * pu * (Decimal(1) - r / Decimal(100)); tva_montant = ht * (t / Decimal(100))
                DevisClientLigne.objects.create(devis=instance, total_ht=ht, total_ttc=ht+tva_montant, **ligne)
                total_ht += ht; total_tva += tva_montant
            instance.total_ht = total_ht; instance.total_tva = total_tva; instance.total_ttc = total_ht + total_tva
        for attr, value in validated_data.items(): setattr(instance, attr, value)
        instance.save(); return instance

class DevisClientAdminSerializer(DevisClientCommercialSerializer):
    class Meta(DevisClientCommercialSerializer.Meta): fields = '__all__'; read_only_fields = ['numero', 'commercial', 'client_nom', 'total_ht', 'total_tva', 'total_ttc']

class DevisClientReadOnlySerializer(serializers.ModelSerializer):
    client_nom = serializers.CharField(source='client.contact_nom', read_only=True); a_commande = serializers.BooleanField(source='commandes.exists', read_only=True)
    class Meta: model = DevisClient; fields = ['id', 'numero', 'client', 'client_nom', 'statut', 'total_ttc', 'date_devis', 'a_commande']

class CommandeClientLigneSerializer(serializers.ModelSerializer):
    class Meta: model = CommandeClientLigne; fields = '__all__'; read_only_fields = ['total_ht', 'total_ttc', 'commande']

class CommandeClientLigneMagasinierSerializer(serializers.ModelSerializer):
    produit_designation = serializers.CharField(source='produit.designation', read_only=True)
    class Meta: model = CommandeClientLigne; fields = ['id', 'produit', 'produit_designation', 'quantite', 'quantite_livree']; read_only_fields = fields

class CommandeClientMagasinierSerializer(serializers.ModelSerializer):
    lignes = CommandeClientLigneMagasinierSerializer(many=True, read_only=True)
    client_nom = serializers.CharField(source='client.contact_nom', read_only=True)
    class Meta: model = CommandeClient; fields = ['id', 'numero', 'devis', 'client', 'client_nom', 'date_commande', 'statut', 'lignes']; read_only_fields = fields

# IRAY IHANY IZAO - VERSION CORRECTE POUR ONETOONE
class CommandeClientAdminSerializer(serializers.ModelSerializer):
    lignes = CommandeClientLigneSerializer(many=True, required=False)
    client_nom = serializers.CharField(source='client.contact_nom', read_only=True)
    a_bl = serializers.BooleanField(source='bon_livraisons.exists', read_only=True)
    a_facture = serializers.SerializerMethodField() # <-- OVANA
    
    class Meta: model = CommandeClient; fields = ['id', 'numero', 'devis', 'client', 'client_nom', 'commercial', 'date_commande', 'statut', 'total_ht', 'total_tva', 'total_ttc', 'a_bl', 'a_facture', 'lignes']; read_only_fields = ['numero', 'commercial', 'client_nom', 'total_ht', 'total_tva', 'total_ttc', 'a_bl', 'a_facture']
    
    @transaction.atomic
    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes', [])
        validated_data['commercial'] = self.context['request'].user
        commande = CommandeClient.objects.create(**validated_data)
        total_ht, total_tva = Decimal(0), Decimal(0)
        for ligne in lignes_data:
            q = Decimal(ligne['quantite']); pu = Decimal(ligne['prix_unitaire_ht']); r = Decimal(ligne.get('remise', 0)); t = Decimal(ligne.get('tva', 20))
            ht = q * pu * (Decimal(1) - r / Decimal(100)); tva_montant = ht * (t / Decimal(100))
            CommandeClientLigne.objects.create(commande=commande, total_ht=ht, total_ttc=ht+tva_montant, **ligne)
            total_ht += ht; total_tva += tva_montant
        commande.total_ht = total_ht; commande.total_tva = total_tva; commande.total_ttc = total_ht + total_tva; commande.save()
        return commande
        
    @transaction.atomic
    def update(self, instance, validated_data):
        lignes_data = validated_data.pop('lignes', None)
        if lignes_data is not None:
            instance.lignes.all().delete(); total_ht, total_tva = Decimal(0), Decimal(0)
            for ligne in lignes_data:
                q = Decimal(ligne['quantite']); pu = Decimal(ligne['prix_unitaire_ht']); r = Decimal(ligne.get('remise', 0)); t = Decimal(ligne.get('tva', 20))
                ht = q * pu * (Decimal(1) - r / Decimal(100)); tva_montant = ht * (t / Decimal(100))
                CommandeClientLigne.objects.create(commande=instance, total_ht=ht, total_ttc=ht+tva_montant, **ligne)
                total_ht += ht; total_tva += tva_montant
            instance.total_ht = total_ht; instance.total_tva = total_tva; instance.total_ttc = total_ht + total_tva
        for attr, value in validated_data.items(): setattr(instance, attr, value)
        instance.save(); return instance

    def get_a_facture(self, obj): # <-- IZAO NO VAOVAO
        return FactureClient.objects.filter(bl__commande=obj).exists()

class CommandeClientCommercialSerializer(CommandeClientAdminSerializer):
    class Meta(CommandeClientAdminSerializer.Meta): read_only_fields = ['numero', 'commercial', 'client_nom', 'total_ht', 'total_tva', 'total_ttc']

class BonLivraisonLigneSerializer(serializers.ModelSerializer):
    produit_designation = serializers.CharField(source='produit.designation', read_only=True)
    class Meta: model = BonLivraisonLigne; fields = ['id', 'bl', 'produit', 'produit_designation', 'quantite_livree']; read_only_fields = ['bl']

class BonLivraisonMagasinierSerializer(serializers.ModelSerializer):
    lignes = BonLivraisonLigneSerializer(many=True, required=False)
    class Meta: model = BonLivraison; fields = ['id', 'numero', 'commande', 'date_livraison', 'statut', 'lignes']; read_only_fields = ['numero']
    @transaction.atomic
    def create(self, validated_data): 
        lignes_data = validated_data.pop('lignes', []); 
        bl = BonLivraison.objects.create(**validated_data); 
        for ligne in lignes_data: BonLivraisonLigne.objects.create(bl=bl, **ligne)
        return bl
    @transaction.atomic
    def update(self, instance, validated_data):
        lignes_data = validated_data.pop('lignes', None)
        for attr, value in validated_data.items(): setattr(instance, attr, value); instance.save()
        if lignes_data is not None: 
            instance.lignes.all().delete(); 
            for ligne_data in lignes_data: BonLivraisonLigne.objects.create(bl=instance, **ligne_data)
        return instance
    
class BonLivraisonTrackingSerializer(serializers.ModelSerializer):
    client_nom = serializers.CharField(source='commande.client.contact_nom', read_only=True)
    chauffeur_nom = serializers.CharField(source='chauffeur.nom', read_only=True)
    commande_numero = serializers.CharField(source='commande.numero', read_only=True)
    lignes = BonLivraisonLigneSerializer(many=True, read_only=True)
    a_une_facture = serializers.SerializerMethodField()
    facture_id = serializers.SerializerMethodField()
    facture_numero = serializers.SerializerMethodField()

    class Meta: model = BonLivraison; fields = '__all__'

    def get_a_une_facture(self, obj): return hasattr(obj, 'facture')
    def get_facture_id(self, obj): return obj.facture.id if hasattr(obj, 'facture') else None
    def get_facture_numero(self, obj): return obj.facture.numero if hasattr(obj, 'facture') else None

class ChauffeurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chauffeur
        fields = ['id', 'nom', 'prenom', 'telephone', 'cin', 'numero_permis', 'photo', 'actif'] 


class BonLivraisonReadOnlySerializer(serializers.ModelSerializer):
    client_nom = serializers.CharField(source='commande.client.contact_nom', read_only=True)
    commande_numero = serializers.CharField(source='commande.numero', read_only=True)
    lignes = BonLivraisonLigneSerializer(many=True, read_only=True)
    a_facture = serializers.SerializerMethodField()

    class Meta: model = BonLivraison; fields = ['id', 'numero', 'commande', 'commande_numero', 'client_nom', 'date_livraison', 'statut', 'a_facture', 'lignes']

    def get_a_facture(self, obj):
        return hasattr(obj, 'facture')

class FactureClientLigneSerializer(serializers.ModelSerializer):
    produit_designation = serializers.CharField(source='produit.designation', read_only=True)
    class Meta: model = FactureClientLigne; fields = ['id', 'facture', 'produit', 'produit_designation', 'quantite', 'prix_unitaire_ht', 'remise', 'tva', 'total_ht', 'total_ttc']; read_only_fields = ['total_ht', 'total_ttc', 'facture']

class FactureClientReadOnlySerializer(serializers.ModelSerializer):
    reste_a_payer = serializers.SerializerMethodField() # OVANA
    client_nom = serializers.CharField(source='client.contact_nom', read_only=True)
    bl_numero = serializers.CharField(source='bl.numero', read_only=True)
    lignes = FactureClientLigneSerializer(many=True, read_only=True)
    
    class Meta: 
        model = FactureClient
        fields = ['id', 'numero', 'bl', 'bl_numero', 'client', 'client_nom', 'date_facture', 'date_echeance', 'statut', 'total_ttc', 'montant_paye', 'reste_a_payer', 'lignes']
        read_only_fields = ['id', 'numero', 'client', 'client_nom']

    def get_reste_a_payer(self, obj): # AMPIO IZAO
        return float(obj.total_ttc or 0) - float(obj.montant_paye or 0)
    
class FacturePourPaiementSerializer(serializers.ModelSerializer):
    client_nom = serializers.CharField(source='client.contact_nom', read_only=True)
    reste_a_payer = serializers.ReadOnlyField()
    class Meta: model = FactureClient; fields = ['id', 'numero', 'client_nom', 'total_ttc', 'montant_paye', 'reste_a_payer', 'date_echeance']
class FactureClientCreateSerializer(serializers.Serializer):
    bon_livraison = serializers.IntegerField()

    def validate_bon_livraison(self, value):
        try:
            bl = BonLivraison.objects.get(id=value)
        except BonLivraison.DoesNotExist:
            raise serializers.ValidationError("BL introuvable")

        if bl.statut!= 'VALIDEE' or bl.statut_livraison!= 'LIVREE':
            raise serializers.ValidationError(f"Le BL doit être VALIDEE et LIVREE")

        if FactureClient.objects.filter(bl=bl).exclude(statut='ANNULEE').exists():
            raise serializers.ValidationError(f"Une facture existe déjà pour ce BL")

        return value

class PaiementClientSerializer(serializers.ModelSerializer):
    facture_numero = serializers.CharField(source='facture.numero', read_only=True)
    client_nom = serializers.CharField(source='facture.client.contact_nom', read_only=True)
    bl_numero = serializers.CharField(source='facture.bl.numero', read_only=True)
    class Meta: model = PaiementClient; fields = '__all__'; read_only_fields = ['numero']
    
class BonLivraisonListSerializer(serializers.ModelSerializer): 
    client_nom = serializers.CharField(source='commande.client.contact_nom', read_only=True)
    montant = serializers.DecimalField(source='commande.total_ttc', max_digits=12, decimal_places=2, read_only=True)
    class Meta: 
        model = BonLivraison
        fields = ['id', 'numero', 'client_nom', 'date_depart', 'date_livraison_reelle', 'montant', 'statut_livraison']
    
class CommandePourBLSerializer(serializers.ModelSerializer):
    client_nom = serializers.CharField(source='client.contact_nom', read_only=True)
    reste_a_livrer = serializers.SerializerMethodField()
    class Meta: model = CommandeClient; fields = ['id', 'numero', 'client', 'client_nom', 'statut', 'total_ttc', 'reste_a_livrer']
    def get_reste_a_livrer(self, obj):
        total_cmd = obj.lignes.aggregate(total=models.Sum('quantite'))['total'] or 0
        total_livree = obj.lignes.aggregate(total=models.Sum('quantite_livree'))['total'] or 0
        return float(total_cmd - total_livree)