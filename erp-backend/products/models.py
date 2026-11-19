from django.db import models
from django.conf import settings
from django.utils import timezone 


class Categorie(models.Model):
    nom = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Categorie"
        verbose_name_plural = "Categories"
        ordering = ['nom']

    def __str__(self):
        return self.nom

class Produit(models.Model):
    STATUT_CHOICES = [
        ('ACTIF', 'Actif'),
        ('INACTIF', 'Inactif'),
        ('BROUILLON', 'Brouillon'),
    ]
    
    code = models.CharField(max_length=50, unique=True)
    designation = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    categorie = models.ForeignKey(Categorie, on_delete=models.SET_NULL, null=True, blank=True, related_name="produits")
    
    prix_achat = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    prix_vente = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    stock_min = models.IntegerField(default=0) 
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='ACTIF')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    @property 
    def stock(self):
        try:
            return self.fiche_stock.quantite
        except models.ObjectDoesNotExist: # <-- OVANA ITO: fa tsy Stock.DoesNotExist
            return 0

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Produit"
        verbose_name_plural = "Produits"

    def __str__(self):
        return f"{self.code} - {self.designation}"

class Fournisseur(models.Model):
    nom = models.CharField(max_length=200)
    contact = models.CharField(max_length=100, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    adresse = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nom

class BonCommande(models.Model):
    STATUT_CHOICES = [
        ('BROUILLON', 'Brouillon'),
        ('ENVOYER', 'Envoyé'),
        ('COMMANDER', 'Commandé'),
        ('PARTIEL', 'Partiellement Reçu'),
        ('RECU', 'Reçu'),
        ('ANNULER', 'Annulé'),
    ]
    numero = models.CharField(max_length=50, unique=True)
    fournisseur = models.ForeignKey(Fournisseur, on_delete=models.PROTECT, related_name='bons_commande')
    date_commande = models.DateField(default=timezone.now)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='BROUILLON')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.numero

class LigneBonCommande(models.Model):
    bon_commande = models.ForeignKey(BonCommande, on_delete=models.CASCADE, related_name='lignes')
    produit = models.ForeignKey(Produit, on_delete=models.PROTECT)
    quantite = models.DecimalField(max_digits=12, decimal_places=2)
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2)
    quantite_recue = models.DecimalField(max_digits=12, decimal_places=2, default=0) 

    @property
    def montant(self):
        return self.quantite * self.prix_unitaire
        
    def __str__(self):
        return f"{self.bon_commande.numero} - {self.produit.designation}"

class HistoriqueStock(models.Model):
    TYPE_CHOICES = [
        ('ENTREE', 'Entrée'),
        ('SORTIE', 'Sortie'),
        ('AJUSTEMENT', 'Ajustement'),
    ]
    
    produit = models.ForeignKey( 
        Produit, 
        on_delete=models.CASCADE, 
        related_name='historiques_stock'
    )
    type_mouvement = models.CharField(max_length=20, choices=TYPE_CHOICES)
    quantite = models.DecimalField(max_digits=12, decimal_places=2)
    
    stock_avant = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, default=0)
    stock_apres = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, default=0)
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    date = models.DateTimeField(auto_now_add=True)
    
    motif = models.CharField(max_length=100, blank=True, null=True)
    reference = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'products_historiquestock' 
        ordering = ['-date']
        verbose_name = "Historique Stock"
        verbose_name_plural = "Historiques Stock"

    def __str__(self):
        return f"{self.produit.code} - {self.type_mouvement} - {self.quantite}"

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('CREATE', 'Creation'), 
        ('UPDATE', 'Modification'), 
        ('DELETE', 'Suppression'),
        ('VIEW', 'Consultation')
    ]
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products_audit_logs'
    )
    user_role = models.CharField(max_length=50, blank=True, null=True)
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    target_model = models.CharField(max_length=50, default='Produit')
    target_id = models.PositiveIntegerField()
    target_name = models.CharField(max_length=255, blank=True, null=True)
    details = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta: 
        ordering = ['-timestamp']
        verbose_name = "Audit Log Produit"
        verbose_name_plural = "Audit Logs Produits"