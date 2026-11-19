from django.db import models, transaction
from django.utils import timezone 
from django.core.exceptions import ValidationError
from decimal import Decimal
from users.models import User
from products.models import Produit
from fournisseur.models import Fournisseur
from vente.models import Chauffeur 
from django.db.models import Sum
import re

def generate_numero(prefix, model, field_name='numero'):
    last = model.objects.filter(**{f"{field_name}__startswith": prefix}).order_by('-id').first()
    if not last: 
        return f"{prefix}00001"
    match = re.search(r'(\d+)$', getattr(last, field_name))
    num = int(match.group(1)) + 1 if match else 1
    return f"{prefix}{num:05d}"
STATUT_DEMANDE_PRIX_CHOICES = [
    ('EN_COURS', 'En cours'),
    ('VALIDEE', 'Validée'),
    ('CLOTURER', 'Clôturée'),
    ('ANNULEE', 'Annulée'),
]

class DemandeAchat(models.Model):
    STATUT = [
        ('BROUILLON', 'Brouillon'),
        ('SOUMIS', 'Soumis'),
        ('APPROUVER', 'Approuvé'),
        ('REJETER', 'Rejeté'),
        ('COMMANDER', 'Commandé')
    ]
    numero = models.CharField(max_length=20, unique=True, blank=True)
    demande_par = models.ForeignKey(User, on_delete=models.PROTECT, related_name='demandes_achat')
    date_demande = models.DateTimeField(default=timezone.now)
    statut = models.CharField(max_length=20, choices=STATUT, default='BROUILLON')
    note = models.TextField(blank=True)
   
    def save(self, *args, **kwargs):
        if not self.numero:
            auj = timezone.now()
            prefix = f"DA-{auj.strftime('%Y%m%d')}-"
            self.numero = generate_numero(prefix, DemandeAchat)
        super().save(*args, **kwargs)
    def __str__(self): return self.numero

class LigneDemandeAchat(models.Model):
    demande = models.ForeignKey(DemandeAchat, related_name='lignes', on_delete=models.CASCADE)
    produit = models.ForeignKey(Produit, on_delete=models.PROTECT)
    quantite = models.DecimalField(max_digits=10, decimal_places=2)
    justification = models.CharField(max_length=255, blank=True)
    def __str__(self): return f"{self.produit.designation} x {self.quantite}"

class DemandePrix(models.Model):
    demande_achat = models.OneToOneField(DemandeAchat, related_name='demande_prix', on_delete=models.PROTECT)
    numero = models.CharField(max_length=20, unique=True, blank=True, null=True)
    objet = models.CharField(max_length=255, blank=True, null=True)
    date_envoi = models.DateTimeField(null=True, blank=True)
    statut = models.CharField(max_length=20, choices=STATUT_DEMANDE_PRIX_CHOICES, default='EN_COURS')
    def save(self, *args, **kwargs):
        if not self.numero:
            auj = timezone.now()
            prefix = f"DP-{auj.strftime('%Y%m%d')}-"
            self.numero = generate_numero(prefix, DemandePrix)
        super().save(*args, **kwargs)
    def __str__(self): return self.numero or f"DP-{self.id}"

class LigneDemandePrix(models.Model):
    demande_prix = models.ForeignKey(DemandePrix, related_name='lignes', on_delete=models.CASCADE)
    fournisseur = models.ForeignKey(Fournisseur, on_delete=models.PROTECT, null=True, blank=True)
    produit = models.ForeignKey(Produit, on_delete=models.PROTECT)
    prix_propose = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    delai_livraison_jours = models.IntegerField(null=True, blank=True)
    class Meta: unique_together = ('demande_prix', 'fournisseur', 'produit')

class Achat(models.Model):
    STATUT = [
        ('BROUILLON', 'Brouillon'), ('EN_ATTENTE', 'En attente'), ('PRET', 'Prêt pour livraison'),
        ('EN_COURS_LIVRAISON', 'En cours livraison'), ('PARTIELLEMENT_RECUE', 'Reçu partiel'),
        ('RECUE', 'Livré complet'), ('ANNULER', 'Annulé')
    ]
    numero = models.CharField(max_length=20, unique=True, blank=True)
    demande_prix = models.OneToOneField(DemandePrix, on_delete=models.PROTECT, null=True, blank=True, related_name='achat')
    fournisseur = models.ForeignKey(Fournisseur, on_delete=models.PROTECT, related_name='achats')
    cree_par = models.ForeignKey(User, on_delete=models.PROTECT, related_name='achats_crees')
    date_achat = models.DateTimeField(default=timezone.now)
    statut = models.CharField(max_length=30, choices=STATUT, default='BROUILLON')
    date_reception = models.DateTimeField(null=True, blank=True)
    chauffeur = models.ForeignKey(Chauffeur, on_delete=models.SET_NULL, null=True, blank=True, related_name='achats_affectes') # <-- Ovaina ny related_name
    vehicule = models.CharField(max_length=100, blank=True, null=True)
    adresse_livraison = models.TextField(blank=True, null=True)
    date_depart = models.DateTimeField(null=True, blank=True)
    date_livraison_reelle = models.DateTimeField(null=True, blank=True)
    nom_recepteur = models.CharField(max_length=255, blank=True, null=True)
    note_livraison = models.TextField(blank=True, null=True)
    preuve_photo = models.ImageField(upload_to='livraisons/', blank=True, null=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._original_statut = self.statut

    def validate_statut(self):
        transitions = {
            "BROUILLON": ["EN_ATTENTE", "ANNULER"], "EN_ATTENTE": ["PRET", "ANNULER"],
            "PRET": ["EN_COURS_LIVRAISON", "PARTIELLEMENT_RECUE", "RECUE", "ANNULER"],
            "EN_COURS_LIVRAISON": ["PARTIELLEMENT_RECUE", "RECUE", "ANNULER"],
            "PARTIELLEMENT_RECUE": ["RECUE", "ANNULER"], "RECUE": ["ANNULER"], "ANNULER": [],
        }
        if self.pk and self._original_statut != self.statut:
            allowed = transitions.get(self._original_statut, [])
            if self.statut not in allowed:
                raise ValidationError({'statut': f"Transition impossible : {self._original_statut} -> {self.statut}"})

    def save(self, *args, **kwargs):
        if not self.numero:
            auj = timezone.now()
            prefix = f"BC-{auj.strftime('%Y%m%d')}-"
            self.numero = generate_numero(prefix, Achat)
        self.validate_statut()
        if self.statut == 'RECUE' and not self.date_reception:
            self.date_reception = timezone.now()
        super().save(*args, **kwargs)
        self._original_statut = self.statut
    @property
    def total_ht(self):
        return sum(ligne.quantite * ligne.prix_achat_unitaire for ligne in self.lignes.all())
    def __str__(self): return self.numero

class LigneAchat(models.Model):
    achat = models.ForeignKey(Achat, related_name='lignes', on_delete=models.CASCADE)
    produit = models.ForeignKey(Produit, on_delete=models.PROTECT)
    quantite = models.DecimalField(max_digits=10, decimal_places=2)
    prix_achat_unitaire = models.DecimalField(max_digits=12, decimal_places=2)
    @property
    def total_ht(self): return self.quantite * self.prix_achat_unitaire

class Reception(models.Model):
    numero = models.CharField(max_length=30, unique=True, blank=True)
    bon_commande = models.ForeignKey(Achat, on_delete=models.PROTECT, related_name='receptions')
    date_reception = models.DateTimeField(default=timezone.now)
    cree_par = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='receptions_crees')
    note = models.TextField(blank=True, null=True)
    def save(self, *args, **kwargs):
        if not self.numero:
            auj = timezone.now()
            prefix = f"RECEP-{auj.strftime('%Y%m%d')}-"
            self.numero = generate_numero(prefix, Reception)
        super().save(*args, **kwargs)
    def __str__(self): return self.numero

class LigneReception(models.Model):
    reception = models.ForeignKey(Reception, on_delete=models.CASCADE, related_name='lignes')
    produit = models.ForeignKey(Produit, on_delete=models.PROTECT)
    quantite_commandee = models.DecimalField(max_digits=10, decimal_places=2)
    quantite_recue = models.DecimalField(max_digits=10, decimal_places=2)
    quantite_refusee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    motif_refus = models.CharField(max_length=255, blank=True, null=True)

class RetourFournisseur(models.Model):
    achat = models.ForeignKey(Achat, related_name="retours", on_delete=models.PROTECT)
    numero = models.CharField(max_length=20, unique=True, blank=True)
    date_retour = models.DateTimeField(default=timezone.now)
    motif = models.TextField()
    def save(self, *args, **kwargs):
        if not self.numero:
            auj = timezone.now()
            prefix = f"RT-{auj.strftime('%Y%m%d')}-"
            self.numero = generate_numero(prefix, RetourFournisseur)
        super().save(*args, **kwargs)

class LigneRetour(models.Model):
    retour = models.ForeignKey(RetourFournisseur, related_name='lignes', on_delete=models.CASCADE)
    produit = models.ForeignKey(Produit, on_delete=models.PROTECT)
    quantite = models.DecimalField(max_digits=10, decimal_places=2)

class FactureFournisseur(models.Model):
    STATUT_CHOICES = [('IMPAYEE', 'Impayée'), ('PARTIEL', 'Partielle'), ('PAYEE', 'Payée')]
    achat = models.ForeignKey('achat.Achat', related_name="factures", on_delete=models.PROTECT)
    numero_facture = models.CharField(max_length=50, unique=True, editable=False)
    date_facture = models.DateField()
    montant_ttc = models.DecimalField(max_digits=12, decimal_places=2)
    date_echeance = models.DateField()
    montant_regle = models.DecimalField(max_digits=12, decimal_places=2, default=0, editable=False)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='IMPAYEE')
    reference = models.CharField(max_length=100, blank=True, null=True)
    @property
    def total_paye(self):
        return self.paiements.aggregate(total=Sum('montant'))['total'] or Decimal('0.00')
    @property
    def reste_a_payer(self): 
        reste = self.montant_ttc - self.total_paye
        return max(Decimal('0.00'), reste)
    def recalculer_statut(self):
        total_paye = self.total_paye 
        self.montant_regle = total_paye
        if total_paye >= self.montant_ttc: 
            self.statut = 'PAYEE'
        elif total_paye > 0: 
            self.statut = 'PARTIEL'
        else: 
            self.statut = 'IMPAYEE'
        super().save(update_fields=['montant_regle', 'statut'])
    def save(self, *args, **kwargs):
        if not self.numero_facture: 
            self.numero_facture = generate_numero('FF-', FactureFournisseur, 'numero_facture')
        super().save(*args, **kwargs)
    def __str__(self): 
        return f"{self.numero_facture} - {self.achat.numero}"
    
class PaiementFournisseur(models.Model):
    MODE = [('VIREMENT','Virement'), ('CHEQUE','Chèque'), ('ESPECE','Espèce'), ('MOBILE_MONEY','Mobile Money')]
    numero = models.CharField(max_length=50, unique=True, editable=False)
    facture = models.ForeignKey(FactureFournisseur, related_name='paiements', on_delete=models.CASCADE) 
    date_paiement = models.DateField(default=timezone.localdate)
    montant = models.DecimalField(max_digits=12, decimal_places=2)
    mode_paiement = models.CharField(max_length=20, choices=MODE, db_column='mode') 
    reference = models.CharField(max_length=100, blank=True, null=True)

    class Meta: 
        ordering = ['-date_paiement']
        db_table = 'paiement_fournisseur'
    def save(self, *args, **kwargs):
        if not self.numero: 
            self.numero = generate_numero('PF-', PaiementFournisseur)
        super().save(*args, **kwargs)
        self.facture.recalculer_statut() 
    def delete(self, *args, **kwargs):
        facture = self.facture
        super().delete(*args, **kwargs)
        facture.recalculer_statut() 
    def __str__(self): 
        return self.numero