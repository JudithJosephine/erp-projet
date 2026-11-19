from django.db import models
from django.contrib.auth.models import AbstractUser

class Role(models.TextChoices):
    ADMIN = "ADMIN", "Administrateur"
    MAGASINIER = "MAGASINIER", "Magasinier"
    ACHETEUR = "ACHETEUR", "Acheteur"
    COMMERCIAL = "COMMERCIAL", "Commercial"
    COMPTABLE = "COMPTABLE", "Comptable"
class Permission(models.Model):
    name = models.CharField(max_length=100,unique=True)
    code = models.CharField(max_length=100,unique=True)
    description = models.TextField(blank=True)
    def __str__(self):
        return self.name
class RolePermission(models.Model):
    role = models.CharField( max_length=20, choices=Role.choices)
    permission = models.ForeignKey(Permission,on_delete=models.CASCADE)
    class Meta:
        unique_together = ("role","permission")
    def __str__(self):
        return f"{self.role} - {self.permission.name}"
class User(AbstractUser):
    role = models.CharField(max_length=20,choices=Role.choices,default=Role.MAGASINIER)
    telephone = models.CharField(max_length=20,blank=True,null=True)
    def __str__(self):
        return f"{self.username} - {self.role}"
class UserHistory(models.Model):
    user = models.ForeignKey(User,on_delete=models.CASCADE)
    action = models.CharField(max_length=255)
    date = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return f"{self.user.username} - {self.action}"
    
    