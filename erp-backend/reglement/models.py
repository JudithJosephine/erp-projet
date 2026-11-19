from django.db import models
from django.utils import timezone
from django.conf import settings
from decimal import Decimal
from vente.models import FactureClient
from achat.models import FactureFournisseur

MODE_PAIEMENT = [
    ('ESPECES', 'Espèces'),
    ('CHEQUE', 'Chèque'),
    ('VIREMENT', 'Virement'),
    ('MOBILE_MONEY', 'Mobile Money'),
]

class ReglementClient(models.Model):
    facture = models.ForeignKey(FactureClient, on_delete=models.PROTECT, related_name='reglements')
    date_reglement = models.DateField(default=timezone.now)
    montant = models.DecimalField(max_digits=12, decimal_places=2)
    mode = models.CharField(max_length=20, choices=MODE_PAIEMENT, default='ESPECES')
    reference = models.CharField(max_length=100, blank=True, null=True)
    note = models.TextField(blank=True, null=True)
    cree_par = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new:
            facture = self.facture
            facture.montant_paye += self.montant
            if facture.montant_paye >= facture.total_ttc:
                facture.statut = 'PAYEE'
            elif facture.montant_paye > 0:
                facture.statut = 'PARTIEL'
            facture.save(update_fields=['montant_paye', 'statut'])

    def delete(self, *args, **kwargs):
        facture = self.facture
        facture.montant_paye -= self.montant
        if facture.montant_paye < facture.total_ttc:
            facture.statut = 'IMPAYEE'
        facture.save(update_fields=['montant_paye', 'statut'])
        super().delete(*args, **kwargs)

class ReglementFournisseur(models.Model):
    facture = models.ForeignKey(FactureFournisseur, on_delete=models.PROTECT, related_name='reglements')
    date_reglement = models.DateField(default=timezone.now)
    montant = models.DecimalField(max_digits=12, decimal_places=2)
    mode = models.CharField(max_length=20, choices=MODE_PAIEMENT, default='ESPECES')
    reference = models.CharField(max_length=100, blank=True, null=True)
    note = models.TextField(blank=True, null=True)
    cree_par = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.facture.recalculer_statut() # <-- MIANTRA IZAO

    def delete(self, *args, **kwargs):
        facture = self.facture
        super().delete(*args, **kwargs)
        facture.recalculer_statut() # <-- MIANTRA IZAO

    def __str__(self):
        return f"Regl {self.facture.numero_facture} - {self.montant}"