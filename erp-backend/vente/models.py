from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from django.conf import settings
from django.utils import timezone 
from clients.models import Client
from products.models import Produit
from datetime import date, timedelta
import re

def generate_numero(prefix, model):
    last = model.objects.filter(numero__startswith=prefix).order_by('-id').first()
    if not last: return f"{prefix}00001"
    match = re.search(r'(\d+)$', last.numero)
    num = int(match.group(1)) + 1 if match else 1
    return f"{prefix}{num:05d}"

def default_date_echeance():
    return date.today() + timedelta(days=30)

class DevisClient(models.Model):
    STATUT_CHOICES = [('BROUILLON', 'Brouillon'), ('ENVOYE', 'Envoyé'), ('ACCEPTE', 'Accepté'), ('REFUSE', 'Refusé')]
    numero = models.CharField(max_length=50, unique=True, editable=False)
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name='devis')
    commercial = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='devis_commercial')
    date_devis = models.DateField()
    date_validite = models.DateField()
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='BROUILLON')
    total_ht = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_tva = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_ttc = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    def save(self, *args, **kwargs):
        if not self.numero: self.numero = generate_numero('DV', DevisClient)
        super().save(*args, **kwargs)
    def __str__(self): return self.numero

class DevisClientLigne(models.Model):
    devis = models.ForeignKey(DevisClient, on_delete=models.CASCADE, related_name='lignes')
    produit = models.ForeignKey(Produit, on_delete=models.PROTECT)
    quantite = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))]) # CORRECTE
    prix_unitaire_ht = models.DecimalField(max_digits=10, decimal_places=2)
    remise = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tva = models.DecimalField(max_digits=5, decimal_places=2, default=20)
    total_ht = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    total_ttc = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    def save(self, *args, **kwargs):
        ht = self.quantite * self.prix_unitaire_ht * (1 - self.remise / 100)
        self.total_ht = ht; self.total_ttc = ht * (1 + self.tva / 100)
        super().save(*args, **kwargs)
    def __str__(self): return f"{self.devis.numero} - {self.produit.designation}"

class CommandeClient(models.Model):
    STATUT_CHOICES = [('EN_ATTENTE', 'En attente'), ('VALIDEE', 'Confirmée'),('LIVREE_PARTIEL', 'Livrée partiellement'), ('LIVREE', 'Livrée'), ('ANNULEE', 'Annulée')]
    numero = models.CharField(max_length=50, unique=True, editable=False)
    devis = models.ForeignKey(DevisClient, on_delete=models.SET_NULL, null=True, blank=True, related_name='commandes')
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name='commandes')
    commercial = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='commandes_commercial')
    date_commande = models.DateField()
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='EN_ATTENTE')
    total_ht = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_tva = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_ttc = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    def save(self, *args, **kwargs):
        if not self.numero: self.numero = generate_numero('BC', CommandeClient)
        super().save(*args, **kwargs)
    def __str__(self): return self.numero

class CommandeClientLigne(models.Model):
    commande = models.ForeignKey(CommandeClient, on_delete=models.CASCADE, related_name='lignes')
    produit = models.ForeignKey(Produit, on_delete=models.PROTECT)
    quantite = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))]) # CORRECTE
    quantite_livree = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    prix_unitaire_ht = models.DecimalField(max_digits=10, decimal_places=2)
    remise = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tva = models.DecimalField(max_digits=5, decimal_places=2, default=20)
    total_ht = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    total_ttc = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    def save(self, *args, **kwargs):
        ht = self.quantite * self.prix_unitaire_ht * (1 - self.remise / 100)
        self.total_ht = ht; self.total_ttc = ht * (1 + self.tva / 100)
        super().save(*args, **kwargs)
    def __str__(self): return f"{self.commande.numero} - {self.produit.designation}"



class Chauffeur(models.Model):
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100, blank=True, null=True)
    telephone = models.CharField(max_length=20, blank=True, null=True)
    cin = models.CharField(max_length=20, blank=True, null=True)
    numero_permis = models.CharField(max_length=50, unique=True)
    actif = models.BooleanField(default=True)
    photo = models.ImageField(upload_to='chauffeurs/', blank=True, null=True)
    date_creation = models.DateTimeField(default=timezone.now)
    def __str__(self): return f"{self.nom} {self.prenom or ''}".strip()

class BonLivraison(models.Model):
    STATUT_CHOICES = [('BROUILLON', 'Brouillon'), ('VALIDEE', 'Validée'), ('ANNULEE', 'Annulée')]
    STATUT_LIVRAISON_CHOICES = [('PRET', 'Prêt'),('EN_COURS', 'En cours de livraison'),('LIVREE', 'Livrée'),('ECHEC', 'Echec de livraison')]
    numero = models.CharField(max_length=50, unique=True, editable=False)
    commande = models.ForeignKey(CommandeClient, on_delete=models.PROTECT, related_name='bon_livraisons')
    date_livraison = models.DateField(default=date.today)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='BROUILLON')
    statut_livraison = models.CharField(max_length=20, choices=STATUT_LIVRAISON_CHOICES, default='PRET')
    chauffeur = models.ForeignKey(Chauffeur, on_delete=models.SET_NULL, null=True, blank=True, related_name='livraisons')
    date_depart = models.DateTimeField(null=True, blank=True)
    date_livraison_reelle = models.DateTimeField(null=True, blank=True)
    adresse_livraison = models.TextField(blank=True, null=True)
    note_livraison = models.TextField(blank=True, null=True)
    preuve_photo = models.ImageField(upload_to='preuves_livraison/', null=True, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    signature_client = models.TextField(null=True, blank=True) # base64 signature
    nom_recepteur = models.CharField(max_length=255, blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.numero: self.numero = generate_numero('BL', BonLivraison)
        super().save(*args, **kwargs) 
    def __str__(self): return self.numero

class BonLivraisonLigne(models.Model):
    bl = models.ForeignKey(BonLivraison, on_delete=models.CASCADE, related_name='lignes')
    produit = models.ForeignKey(Produit, on_delete=models.PROTECT)
    quantite_livree = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))]) # CORRECTE
    def __str__(self): return f"{self.bl.numero} - {self.produit.designation}"

class FactureClient(models.Model):
    STATUT_CHOICES = [('BROUILLON', 'Brouillon'), ('VALIDEE', 'Validée'), ('PAYEE', 'Payée'), ('IMPAYEE', 'Impayée'), ('PARTIEL', 'Partielle')]
    numero = models.CharField(max_length=50, unique=True, editable=False)
    bl = models.OneToOneField(BonLivraison, on_delete=models.PROTECT, related_name='facture', null=True, blank=True)
    client = models.ForeignKey(Client, on_delete=models.PROTECT)
    date_facture = models.DateField(default=date.today)
    date_echeance = models.DateField(default=default_date_echeance)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='IMPAYEE')
    total_ht = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_tva = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_ttc = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    montant_paye = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    @property
    def reste_a_payer(self): return self.total_ttc - self.montant_paye
    def save(self, *args, **kwargs):
        if not self.numero: self.numero = generate_numero('FC', FactureClient)
        super().save(*args, **kwargs)
    def __str__(self): return self.numero

class FactureClientLigne(models.Model):
    facture = models.ForeignKey(FactureClient, on_delete=models.CASCADE, related_name='lignes')
    produit = models.ForeignKey(Produit, on_delete=models.PROTECT)
    quantite = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    prix_unitaire_ht = models.DecimalField(max_digits=10, decimal_places=2)
    remise = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tva = models.DecimalField(max_digits=5, decimal_places=2, default=20)
    total_ht = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    total_ttc = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    def save(self, *args, **kwargs):
        ht = self.quantite * self.prix_unitaire_ht * (1 - self.remise / 100)
        self.total_ht = ht; self.total_ttc = ht * (1 + self.tva / 100)
        super().save(*args, **kwargs)
    def __str__(self): return f"{self.facture.numero} - {self.produit.designation}"

class PaiementClient(models.Model):
    MODE_PAIEMENT = [('ESPECE', 'Espèce'), ('VIREMENT', 'Virement'), ('CHEQUE', 'Chèque'), ('MOBILE_MONEY', 'Mobile Money')]
    numero = models.CharField(max_length=50, unique=True, editable=False)
    facture = models.ForeignKey(FactureClient, on_delete=models.PROTECT, related_name='paiements')
    date_paiement = models.DateField()
    mode_paiement = models.CharField(max_length=20, choices=MODE_PAIEMENT)
    montant = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))]) # CORRECTE
    reference = models.CharField(max_length=100, blank=True, null=True)
    def save(self, *args, **kwargs):
        if not self.numero: self.numero = generate_numero('PC', PaiementClient)
        super().save(*args, **kwargs)
    def __str__(self): return self.numero