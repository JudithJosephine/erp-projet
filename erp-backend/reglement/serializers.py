from rest_framework import serializers
from.models import ReglementClient, ReglementFournisseur
from vente.serializers import FactureClientReadOnlySerializer
# from achat.serializers import FactureFournisseurReadOnlySerializer # <-- FAFANA/COMMENTE IZAY

class ReglementClientSerializer(serializers.ModelSerializer):
    cree_par_nom = serializers.CharField(source='cree_par.username', read_only=True)
    facture_detail = FactureClientReadOnlySerializer(source='facture', read_only=True)
    class Meta:
        model = ReglementClient
        fields = ['id', 'facture', 'facture_detail', 'date_reglement', 'montant', 'mode', 'reference', 'note', 'cree_par_nom']
        read_only_fields = ['cree_par_nom']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['cree_par'] = request.user
        facture = validated_data['facture']
        solde = facture.total_ttc - facture.montant_paye
        if validated_data['montant'] > solde:
            raise serializers.ValidationError({'montant': f'Le montant dépasse le solde: {solde}'})
        return super().create(validated_data)

class ReglementFournisseurSerializer(serializers.ModelSerializer):
    cree_par_nom = serializers.CharField(source='cree_par.username', read_only=True)

    # IREO 3 IREO NO AMPITSIHO MBA HANAFOANA NY BANGA
    facture_numero = serializers.CharField(source='facture.numero_facture', read_only=True)
    fournisseur_nom = serializers.CharField(source='facture.achat.fournisseur.raison_sociale', read_only=True)
    achat_numero = serializers.CharField(source='facture.achat.numero', read_only=True)

    facture_detail = serializers.SerializerMethodField()

    class Meta:
        model = ReglementFournisseur
        # NAMPITSIKA IREO 3 IREO
        fields = ['id', 'facture', 'facture_numero', 'fournisseur_nom', 'achat_numero', 'facture_detail', 'date_reglement', 'montant', 'mode', 'reference', 'note', 'cree_par_nom']
        read_only_fields = ['cree_par_nom', 'facture_numero', 'fournisseur_nom', 'achat_numero']

    def get_facture_detail(self, obj):
        facture = obj.facture
        return {
            'id': facture.id,
            'numero': facture.numero_facture,
            'date_facture': facture.date_facture,
            'montant_ttc': facture.montant_ttc,
            'montant_regle': facture.montant_regle,
            'solde': facture.montant_ttc - facture.montant_regle,
            'statut': facture.statut,
            'fournisseur': facture.achat.fournisseur.raison_sociale if facture.achat else None
        }

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['cree_par'] = request.user
        facture = validated_data['facture']
        solde = facture.montant_ttc - facture.montant_regle
        if validated_data['montant'] > solde:
            raise serializers.ValidationError({'montant': f'Le montant dépasse le solde: {solde}'})
        return super().create(validated_data)