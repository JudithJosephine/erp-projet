from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Client(models.Model):
    # 1. INFO GENERALE
    code = models.CharField(max_length=50, unique=True, blank=False, null=False)
    raison_sociale = models.CharField(max_length=200, blank=False, null=False)
    contact_nom = models.CharField(max_length=100, blank=True, null=True)

    # 2. INFO CONTACT
    email = models.EmailField(blank=True, null=True)
    telephone = models.CharField(max_length=20, blank=True, null=True)
    adresse = models.TextField(blank=True, null=True)
    ville = models.CharField(max_length=100, blank=True, null=True)

    # 3. INFO COMPTA
    nif = models.CharField(max_length=50, blank=True, null=True)
    stat = models.CharField(max_length=50, blank=True, null=True)
    delai_paiement = models.IntegerField(default=30)
    plafond_credit = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    # 4. META
    note = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    date_creation = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_creation']
        verbose_name = "Client"
        verbose_name_plural = "Clients"

    def __str__(self):
        return f"{self.code} - {self.raison_sociale}"

class Fournisseur(models.Model):
    # 1. INFO GENERALE
    code = models.CharField(max_length=50, unique=True, blank=False, null=False)
    raison_sociale = models.CharField(max_length=100, blank=False, null=False)
    contact_nom = models.CharField(max_length=100, blank=True, null=True)

    # 2. INFO CONTACT
    email = models.EmailField(blank=True, null=True)
    telephone = models.CharField(max_length=20, blank=True, null=True)
    adresse = models.TextField(blank=True, null=True)
    ville = models.CharField(max_length=100, blank=True, null=True)

    # 3. INFO COMPTA
    nif = models.CharField(max_length=50, blank=True, null=True)
    stat = models.CharField(max_length=50, blank=True, null=True)
    delai_paiement = models.IntegerField(default=30)

    # 4. META
    note = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    date_creation = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_creation']
        verbose_name = "Fournisseur"
        verbose_name_plural = "Fournisseurs"

    def __str__(self):
        return f"{self.code} - {self.raison_sociale}"

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('CREATE_CLIENT', 'Création Client'),
        ('UPDATE_CLIENT', 'Modification Client'),
        ('DELETE_CLIENT', 'Suppression Client'),
        ('VIEW_CLIENT', 'Consultation Client'),
        ('VIEW_CLIENT_LIST', 'Liste Clients'),
        ('CREATE_FOURNISSEUR', 'Création Fournisseur'),
        ('UPDATE_FOURNISSEUR', 'Modification Fournisseur'),
        ('DELETE_FOURNISSEUR', 'Suppression Fournisseur'),
        ('VIEW_FOURNISSEUR', 'Consultation Fournisseur'),
        ('VIEW_FOURNISSEUR_LIST', 'Liste Fournisseurs'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    user_role = models.CharField(max_length=50)
    action = models.CharField(max_length=100, choices=ACTION_CHOICES)
    
    target_model = models.CharField(max_length=100) # 'Client' na 'Fournisseur'
    target_id = models.PositiveIntegerField(null=True, blank=True)
    target_name = models.CharField(max_length=255, null=True, blank=True) # ex: "CL001 - DUPONT"
    
    details = models.JSONField(default=dict, blank=True) # mitahiry ny {old: , new: }
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Journal d'audit"
        verbose_name_plural = "Journaux d'audit"

    def __str__(self):
        return f"{self.timestamp.strftime('%d/%m/%Y %H:%M')} - {self.user} - {self.action}"