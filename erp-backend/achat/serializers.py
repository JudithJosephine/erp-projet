from django.db.models.aggregates import Sum
from django.db import transaction
from rest_framework import serializers
from .models import *
from products.serializers import ProduitSerializer
from fournisseur.serializers import FournisseurSerializer
from vente.serializers import ChauffeurSerializer 
from decimal import Decimal
from stock.models import MouvementStock, Stock
from django.utils import timezone

def formatAr(val):
    return "{:,.2f}".format(Decimal(val or 0)).replace(",", " ")

def normalize_statut(value):
    if not value: return value
    mapping = {
        'BROUILLON': 'BROUILLON', 'VALIDER': 'EN_ATTENTE', 'EN_ATTENTE': 'EN_ATTENTE',
        'PRET': 'PRET', 'EN_COURS_LIVRAISON': 'EN_COURS_LIVRAISON', 'RECU': 'PARTIELLEMENT_RECUE',
        'PARTIELLEMENT_RECUE': 'PARTIELLEMENT_RECUE', 'LIVRE': 'RECUE', 'RECUE': 'RECUE',
        'ANNULER': 'ANNULER', 'ANNULE': 'ANNULER',
        'SOUMIS': 'SOUMIS', 'APPROUVER': 'APPROUVER', 'REJETER': 'REJETER', 'COMMANDER': 'COMMANDER',
        'EN_COURS': 'EN_COURS', 'VALIDEE': 'VALIDEE', 'CLOTURER': 'CLOTURER', 'ANNULEE': 'ANNULEE'
    }
    return mapping.get(value.upper(), value.upper())

class LigneDemandeAchatSerializer(serializers.ModelSerializer):
    produit_detail = ProduitSerializer(source='produit', read_only=True)
    class Meta:
        model = LigneDemandeAchat
        fields = ['id', 'demande', 'produit', 'produit_detail', 'quantite', 'justification']
        read_only_fields = ['demande']

class DemandeAchatSerializer(serializers.ModelSerializer):
    lignes = LigneDemandeAchatSerializer(many=True)
    demande_par_detail = serializers.StringRelatedField(source='demande_par', read_only=True)
    class Meta:
        model = DemandeAchat
        fields = ['id', 'numero', 'demande_par', 'demande_par_detail', 'date_demande', 'statut', 'note', 'lignes', ]
        read_only_fields = ['numero', 'date_demande', 'demande_par', 'demande_par_detail']
    
    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes')
        demande = DemandeAchat.objects.create(**validated_data)
        for ligne_data in lignes_data:
            LigneDemandeAchat.objects.create(demande=demande, **ligne_data)
        return demande

class LigneDemandePrixSerializer(serializers.ModelSerializer):
    fournisseur_detail = FournisseurSerializer(source='fournisseur', read_only=True)
    produit_detail = ProduitSerializer(source='produit', read_only=True)
    class Meta:
        model = LigneDemandePrix
        fields = ['id', 'demande_prix', 'fournisseur', 'fournisseur_detail', 'produit', 'produit_detail', 'prix_propose', 'delai_livraison_jours']
        
class DemandePrixSerializer(serializers.ModelSerializer):
    demande_achat_numero = serializers.CharField(source='demande_achat.numero', read_only=True)
    lignes = LigneDemandePrixSerializer(many=True)
    class Meta:
        model = DemandePrix
        fields = ['id', 'demande_achat', 'demande_achat_numero', 'numero', 'objet', 'date_envoi', 'statut', 'lignes']

class LigneAchatSerializer(serializers.ModelSerializer):
    produit_detail = ProduitSerializer(source='produit', read_only=True)
    qte_deja_recue = serializers.SerializerMethodField()
    total_ht = serializers.SerializerMethodField()
    class Meta:
        model = LigneAchat
        fields = ['id', 'produit', 'produit_detail', 'quantite', 'prix_achat_unitaire', 'total_ht', 'qte_deja_recue']
    
    def get_qte_deja_recue(self, obj):
        res = LigneReception.objects.filter(produit=obj.produit, reception__bon_commande=obj.achat).aggregate(total=Sum('quantite_recue'))
        return res['total'] or Decimal(0)
    
    def get_total_ht(self, obj):
        return obj.quantite * obj.prix_achat_unitaire

class AchatSerializer(serializers.ModelSerializer):
    lignes = LigneAchatSerializer(many=True, read_only=False)
    chauffeur_detail = ChauffeurSerializer(source='chauffeur', read_only=True)
    fournisseur_detail = FournisseurSerializer(source='fournisseur', read_only=True)
    cree_par_nom = serializers.CharField(source='cree_par.username', read_only=True)
    total_ht = serializers.SerializerMethodField()
    total_ht_format = serializers.SerializerMethodField()
    
    class Meta:
        model = Achat
        fields = ['id', 'numero', 'fournisseur', 'fournisseur_detail', 'cree_par', 'cree_par_nom', 'date_achat', 'statut', 'date_reception',
                  'total_ht', 'total_ht_format', 'lignes',
                  'chauffeur', 'chauffeur_detail',  'adresse_livraison', 'date_depart', 'date_livraison_reelle', 'nom_recepteur', 'note_livraison', 'preuve_photo']
        read_only_fields = ['numero', 'date_achat', 'total_ht', 'cree_par', 'cree_par_nom']
    
    def get_total_ht(self, obj): 
        return sum(l.quantite * l.prix_achat_unitaire for l in obj.lignes.all())
    
    def get_total_ht_format(self, obj): 
        return f"{formatAr(self.get_total_ht(obj))} Ar"

    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes', [])
        achat = Achat.objects.create(**validated_data)
        for ligne_data in lignes_data:
            LigneAchat.objects.create(achat=achat, **ligne_data)
        return achat

    def update(self, instance, validated_data):
        lignes_data = validated_data.pop('lignes', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if lignes_data is not None:
            instance.lignes.all().delete()
            for ligne_data in lignes_data:
                LigneAchat.objects.create(achat=instance, **ligne_data)
        return instance

class LigneReceptionSerializer(serializers.ModelSerializer):
    produit_detail = ProduitSerializer(source='produit', read_only=True)
    class Meta:
        model = LigneReception
        fields = ['id', 'reception', 'produit', 'produit_detail', 'quantite_commandee', 'quantite_recue', 'quantite_refusee', 'motif_refus']
        extra_kwargs = {
            'reception': {'required': False, 'allow_null': True}
        }

class ReceptionSerializer(serializers.ModelSerializer):
    achat = serializers.PrimaryKeyRelatedField(queryset=Achat.objects.all(), write_only=True)
    lignes = LigneReceptionSerializer(many=True)
    lignes_detail = LigneReceptionSerializer(source='lignes', many=True, read_only=True)
    bon_commande_id = serializers.IntegerField(source='bon_commande.id', read_only=True)
    bon_commande_numero = serializers.CharField(source='bon_commande.numero', read_only=True)
    fournisseur_nom = serializers.CharField(source='bon_commande.fournisseur.raison_sociale', read_only=True)
    cree_par = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = Reception
        fields = ['id', 'numero', 'achat', 'bon_commande_id', 'bon_commande_numero', 'fournisseur_nom', 'date_reception', 'cree_par', 'note', 'lignes', 'lignes_detail']
        read_only_fields = ['numero']

    @transaction.atomic
    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes')
        achat = validated_data.pop('achat')
        user = self.context['request'].user
        reception = Reception.objects.create(bon_commande=achat, **validated_data)
        for ligne_data in lignes_data:
            ligne_data.pop('reception', None)
            LigneReception.objects.create(reception=reception, **ligne_data)
            if ligne_data['quantite_recue'] > 0:
                MouvementStock.objects.create(
                    produit=ligne_data['produit'],
                    type='ENTREE_ACHAT',  
                    quantite=ligne_data['quantite_recue'],
                    reference=reception.numero,
                    motif=f"Reception BC {achat.numero}",
                    fait_par=user, 
                    date_mouvement=timezone.now() 
                )
                stock, _ = Stock.objects.get_or_create(produit=ligne_data['produit'])
                stock.quantite += ligne_data['quantite_recue']
                stock.save()
        total_commande = sum(l.quantite for l in achat.lignes.all())
        total_recue = LigneReception.objects.filter(reception__bon_commande=achat).aggregate(total=Sum('quantite_recue'))['total'] or 0
        if total_recue >= total_commande:
            if achat.statut == 'PRET':
                achat.statut = 'PARTIELLEMENT_RECUE'
                achat.save()
            achat.statut = 'RECUE'
            achat.date_reception = timezone.now()
            achat.save()
        elif total_recue > 0:
            achat.statut = 'PARTIELLEMENT_RECUE'
            achat.save()
        return reception

class LigneRetourSerializer(serializers.ModelSerializer):
    produit_detail = ProduitSerializer(source='produit', read_only=True)
    class Meta: 
        model = LigneRetour
        fields = ['id', 'retour', 'produit', 'produit_detail', 'quantite']

class RetourFournisseurSerializer(serializers.ModelSerializer):
    lignes = LigneRetourSerializer(many=True)
    class Meta: 
        model = RetourFournisseur
        fields = ['id', 'achat', 'numero', 'date_retour', 'motif', 'lignes']

class FactureFournisseurPourPaiementSerializer(serializers.ModelSerializer):
    fournisseur_nom = serializers.CharField(source='achat.fournisseur.raison_sociale', read_only=True)
    achat_numero = serializers.CharField(source='achat.numero', read_only=True)
    reste_a_payer = serializers.SerializerMethodField()
    montant_ttc_format = serializers.SerializerMethodField()
    class Meta: 
        model = FactureFournisseur
        fields = ['id', 'numero_facture', 'achat_numero', 'date_facture', 'date_echeance', 'fournisseur_nom', 'montant_ttc', 'montant_ttc_format', 'montant_regle', 'reste_a_payer', 'statut']
        read_only_fields = ['numero_facture', 'montant_regle', 'statut', 'reste_a_payer']
    def get_reste_a_payer(self, obj): 
        return obj.montant_ttc - (obj.montant_regle or 0)
    def get_montant_ttc_format(self, obj): 
        return f"{formatAr(obj.montant_ttc)} Ar"

class FactureFournisseurSerializer(serializers.ModelSerializer):
    achat_numero = serializers.CharField(source='achat.numero', read_only=True)
    fournisseur_nom = serializers.CharField(source='achat.fournisseur.raison_sociale', read_only=True)
    reste_a_payer = serializers.SerializerMethodField()
    montant_ttc_format = serializers.SerializerMethodField()
    class Meta: 
        model = FactureFournisseur
        fields = ['id', 'achat', 'achat_numero', 'fournisseur_nom', 'numero_facture', 'date_facture', 'date_echeance', 'montant_ttc', 'montant_ttc_format', 'montant_regle', 'reste_a_payer', 'statut', 'reference']
        read_only_fields = ['numero_facture', 'montant_regle', 'statut', 'reste_a_payer']
    def get_reste_a_payer(self, obj): 
        return obj.montant_ttc - (obj.montant_regle or 0)
    def get_montant_ttc_format(self, obj): 
        return f"{formatAr(obj.montant_ttc)} Ar"

class PaiementFournisseurSerializer(serializers.ModelSerializer):
    facture_numero = serializers.CharField(source='facture.numero_facture', read_only=True)
    fournisseur_nom = serializers.CharField(source='facture.achat.fournisseur.raison_sociale', read_only=True)
    achat_numero = serializers.CharField(source='facture.achat.numero', read_only=True)
    montant_format = serializers.SerializerMethodField()
    class Meta: 
        model = PaiementFournisseur
        fields = ['id', 'numero', 'facture', 'facture_numero', 'fournisseur_nom', 'achat_numero', 'reference', 'date_paiement', 'montant', 'montant_format', 'mode_paiement']
        read_only_fields = ['numero']
    def get_montant_format(self, obj): 
        return f"{formatAr(obj.montant)} Ar"