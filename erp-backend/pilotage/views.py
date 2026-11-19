from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, F, Count
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from vente.models import FactureClient, FactureClientLigne
from achat.models import FactureFournisseur
from stock.models import Stock

class DashboardStatsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = request.user.role
        today = timezone.now().date()
        month_start = today.replace(day=1)
        data = {}
        graph = []

        # ===================================
        # 1. BLOC FINANCE : ADMIN + COMPTABLE
        # ===================================
        if role in ['ADMIN', 'COMPTABLE']:
            ventes_mois = FactureClient.objects.filter(date_facture__gte=month_start).aggregate(total=Sum('total_ttc'))['total'] or Decimal('0')
            achats_mois = FactureFournisseur.objects.filter(date_facture__gte=month_start).aggregate(total=Sum('montant_ttc'))['total'] or Decimal('0')

            # FIX: Maka ny cout avy amin'ny produit
            cout_ventes = FactureClientLigne.objects.filter(facture__date_facture__gte=month_start).aggregate(
                total=Sum(F('quantite') * F('produit__prix_achat')) # NOVA: produit__prix_achat
            )['total'] or Decimal('0')

            impayes = FactureClient.objects.filter(statut='IMPAYEE').aggregate(
                nb=Count('id'),
                montant=Sum(F('total_ttc') - F('montant_paye'))
            )
            dettes = FactureFournisseur.objects.aggregate(montant=Sum(F('montant_ttc') - F('montant_regle')))

            data['ventes_mois'] = float(ventes_mois)
            data['achats_mois'] = float(achats_mois)
            data['marge'] = float(ventes_mois - cout_ventes)
            data['impayes_montant'] = float(impayes['montant'] or 0)
            data['impayes_nb'] = impayes['nb'] or 0
            data['dettes'] = float(dettes['montant'] or 0)

        # ===================================
        # 2. BLOC STOCK : ADMIN + ACHETEUR + MAGASINIER
        # ===================================
        if role in ['ADMIN', 'ACHETEUR', 'MAGASINIER']:
            stock_value = Stock.objects.aggregate(total=Sum(F('quantite') * F('produit__prix_achat')))['total'] or Decimal('0')
            rupture = Stock.objects.filter(quantite__lte=F('seuil_alerte')).count()
            data['stock_value'] = float(stock_value)
            data['rupture'] = rupture

        # ===================================
        # 3. BLOC ACHAT : ACHETEUR + MAGASINIER
        # ===================================
        if role in ['ADMIN', 'ACHETEUR', 'MAGASINIER']:
            achats_mois = FactureFournisseur.objects.filter(date_facture__gte=month_start).aggregate(total=Sum('montant_ttc'))['total'] or Decimal('0')
            data['achats_mois'] = float(achats_mois)

        # ===================================
        # 4. BLOC DETTES : ACHETEUR
        # ===================================
        if role == 'ACHETEUR':
            dettes = FactureFournisseur.objects.aggregate(montant=Sum(F('montant_ttc') - F('montant_regle')))
            data['dettes'] = float(dettes['montant'] or 0)

        # ===================================
        # 5. BLOC VENTE/COMMERCIAL : ADMIN + COMMERCIAL + COMPTABLE
        # ===================================
        if role in ['ADMIN', 'COMMERCIAL', 'COMPTABLE']:
            ventes_mois = FactureClient.objects.filter(date_facture__gte=month_start).aggregate(total=Sum('total_ttc'))['total'] or Decimal('0')
            ventes_nb = FactureClient.objects.filter(date_facture__gte=month_start).count()
            data['ventes_mois'] = float(ventes_mois)
            data['ventes_nb'] = ventes_nb

        # ===================================
        # 6. BLOC IMPAYES : COMMERCIAL
        # ===================================
        if role == 'COMMERCIAL':
            impayes = FactureClient.objects.filter(statut='IMPAYEE').aggregate(
                nb=Count('id'),
                montant=Sum(F('total_ttc') - F('montant_paye'))
            )
            data['impayes_montant'] = float(impayes['montant'] or 0)
            data['impayes_nb'] = impayes['nb'] or 0

        # ===================================
        # 7. BLOC COMMUN : GRAPH 6 MOIS
        # ===================================
        if role in ['ADMIN', 'COMPTABLE', 'COMMERCIAL', 'ACHETEUR']:
            for i in range(5, -1, -1):
                d = month_start - timedelta(days=30*i)
                v = 0
                a = 0
                if role in ['ADMIN', 'COMPTABLE', 'COMMERCIAL']:
                    v = FactureClient.objects.filter(date_facture__year=d.year, date_facture__month=d.month).aggregate(total=Sum('total_ttc'))['total'] or 0
                if role in ['ADMIN', 'COMPTABLE', 'ACHETEUR', 'MAGASINIER']:
                    a = FactureFournisseur.objects.filter(date_facture__year=d.year, date_facture__month=d.month).aggregate(total=Sum('montant_ttc'))['total'] or 0
                graph.append({'mois': d.strftime('%b'), 'ventes': float(v), 'achats': float(a)})

        return Response({
            'role': role,
            'kpi': data,
            'graph': graph
        })