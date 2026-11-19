from django.db import models
from django.utils import timezone
from django.conf import settings
from decimal import Decimal

TYPE_MOUVEMENT = [
    ('ENTREE_MANUELLE', 'Entrée Manuelle'),
    ('ENTREE_ACHAT', 'Entrée Achat'),
    ('SORTIE_MANUELLE', 'Sortie Manuelle'),
    ('SORTIE_VENTE', 'Sortie Vente'),
    ('AJUSTEMENT', 'Ajustement Inventaire'),
]

class Stock(models.Model):
    produit = models.OneToOneField('products.Produit', related_name='fiche_stock', on_delete=models.CASCADE)
    quantite = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))
    seuil_alerte = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('20'))
    updated_at = models.DateTimeField(auto_now=True)
    @property
    def en_alerte(self):
        return self.quantite <= self.seuil_alerte
    def __str__(self):
        return f"Stock {self.produit.designation}: {self.quantite}"

class MouvementStock(models.Model):
    produit = models.ForeignKey('products.Produit', related_name='mouvements_stock', on_delete=models.PROTECT)
    type = models.CharField(max_length=30, choices=TYPE_MOUVEMENT)
    quantite = models.DecimalField(max_digits=12, decimal_places=2)
    motif = models.CharField(max_length=255, blank=True, null=True)
    reference = models.CharField(max_length=50, blank=True, null=True)
    date_mouvement = models.DateTimeField(default=timezone.now)
    fait_par = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    class Meta:
        ordering = ['-date_mouvement']

class Inventaire(models.Model):
    STATUT_CHOICES = [('EN_COURS', 'En cours'), ('VALIDE', 'Validé'), ('ANNULE', 'Annulé')]
    date_debut = models.DateTimeField(default=timezone.now)
    date_fin = models.DateTimeField(null=True, blank=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='EN_COURS')
    cree_par = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='inventaires_crees')
    valide_par = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='inventaires_valides')

class LigneInventaire(models.Model):
    inventaire = models.ForeignKey(Inventaire, on_delete=models.CASCADE, related_name='lignes')
    produit = models.ForeignKey('products.Produit', on_delete=models.CASCADE)
    stock_theorique = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))
    stock_reel = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))
    ecart = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))
    def save(self, *args, **kwargs):
        self.ecart = self.stock_reel - self.stock_theorique
        super().save(*args, **kwargs)
    class Meta:
        unique_together = ['inventaire', 'produit']