import uuid
from django.db import models

def generate_client_code():
    """Mamorona code CL-0001, CL-0002,..."""
    last_client = Client.objects.filter(code__startswith='CL-').order_by('id').last()
    if not last_client:
        return 'CL-0001'
    last_number = int(last_client.code.split('-')[1])
    new_number = last_number + 1
    return f'CL-{str(new_number).zfill(4)}'

class Client(models.Model):
    # 1. INFO GENERALE
    code = models.CharField(max_length=50, unique=True, blank=False, null=False)
    raison_sociale = models.CharField(max_length=100, blank=False, null=False)
    contact_nom = models.CharField(max_length=100, blank=True, null=True)

    # 2. INFO CONTACT
    email = models.EmailField(blank=True, null=True)
    telephone = models.CharField(max_length=20, blank=True, null=True)
    adresse = models.TextField(blank=True, null=True)
    ville = models.CharField(max_length=100, blank=True, null=True)

    # 3. INFO COMPTA/VENTE
    nif = models.CharField(max_length=50, blank=True, null=True)
    stat = models.CharField(max_length=50, blank=True, null=True)
    delai_paiement = models.IntegerField(default=30)
    plafond_credit = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # 4. META
    note = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    date_creation = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Raha tsy misy code dia mamorona ho azy
        if not self.code:
            self.code = generate_client_code()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.code} - {self.raison_sociale}"

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('LOGIN', 'Connexion'),
        ('VIEW_CLIENT_LIST', 'Voir Liste Clients'),
        ('VIEW_CLIENT', 'Consulter Client'),
        ('CREATE_CLIENT', 'Créer Client'),
        ('UPDATE_CLIENT', 'Modifier Client'),
        ('DELETE_CLIENT', 'Supprimer Client'),
    ]

    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    user_role = models.CharField(max_length=50, blank=True, null=True)
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)

    target_model = models.CharField(max_length=50, default='Client')
    target_id = models.CharField(max_length=50, null=True, blank=True)
    target_name = models.CharField(max_length=255, null=True, blank=True)

    details = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Journal d'audit"

    def __str__(self):
        return f"{self.user} [{self.user_role}] - {self.action}"