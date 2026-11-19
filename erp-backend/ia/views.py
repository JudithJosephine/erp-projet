from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Avg
from django.utils import timezone
from datetime import timedelta

from stock.models import Stock, MouvementStock
from achat.models import Achat, LigneAchat
from products.models import Produit
from fournisseur.models import Fournisseur
from vente.models import FactureClient, FactureClientLigne # <-- NOVAOVANA ITO

class IAViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    # IA 1: PREDICTION RUPTURE HYBRIDE
    @action(detail=False, methods=['get'], url_path='alerte-rupture')
    def alerte_rupture(self, request):
        alertes = []
        stocks = Stock.objects.filter(quantite__gt=0).select_related('produit')
        for stock in stocks:
            raison_alerte = None; jours_restants = 999
            if stock.quantite <= stock.seuil_alerte: raison_alerte = f"En dessous du seuil de {stock.seuil_alerte}"
            sorties = MouvementStock.objects.filter(produit=stock.produit, type__in=['SORTIE_VENTE', 'SORTIE_MANUELLE'], date_mouvement__gte=timezone.now() - timedelta(days=30)).aggregate(total=Sum('quantite'))['total'] or 0
            conso_jour = sorties / 30
            if conso_jour > 0:
                jours_restants = float(stock.quantite) / float(conso_jour)
                if jours_restants < 10: raison_alerte = f"Rupture prévue dans {round(jours_restants,1)} jours"
            if raison_alerte:
                alertes.append({'produit_id': stock.produit.id, 'produit': stock.produit.designation, 'stock_actuel': float(stock.quantite), 'seuil_alerte': float(stock.seuil_alerte), 'jours_restants': round(jours_restants, 1), 'alerte': 'CRITIQUE' if stock.quantite <= stock.seuil_alerte else 'ATTENTION', 'raison': raison_alerte})
        alertes.sort(key=lambda x: x['jours_restants'])
        return Response({'data': alertes[:5]})

    # IA 3: SUGGESTION PRIX VENTE
    @action(detail=False, methods=['get'], url_path='suggestion-prix-vente/(?P<produit_id>[^/.]+)')
    def suggestion_prix_vente(self, request, produit_id=None):
        # NOVAOVANA: FactureClientLigne sy facture__statut
        lignes = FactureClientLigne.objects.filter(
            produit_id=produit_id,
            facture__statut__in=['PAYEE', 'VALIDEE']
        ).select_related('facture__client').order_by('-facture__date_facture')[:10]

        if not lignes:
            produit = Produit.objects.filter(id=produit_id).first()
            prix_base = float(produit.prix_achat) if produit and produit.prix_achat else 0
            prix_conseille = prix_base * 1.30
            return Response({'prix_conseille': round(prix_conseille, 2), 'prix_moyen': round(prix_base, 2), 'nb_ventes': 0, 'message': 'Aucun historique de vente. Basé sur prix achat + 30%'}, status=status.HTTP_200_OK)

        prix_vente = [float(l.prix_unitaire_ht) for l in lignes] 
        prix_moyen = sum(prix_vente) / len(prix_vente)
        prix_conseille = prix_moyen * 1.20
        return Response({'prix_conseille': round(prix_conseille, 2), 'prix_moyen': round(prix_moyen, 2), 'nb_ventes': len(lignes), 'message': f'Basé sur {len(lignes)} ventes des 30 derniers jours'})
    
    