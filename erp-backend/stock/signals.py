# signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db.models import F
from django.core.exceptions import ValidationError
from decimal import Decimal
from.models import MouvementStock, Stock

@receiver(post_save, sender=MouvementStock)
def mettre_a_jour_stock(sender, instance, created, **kwargs):
    if not created: return
    stock, _ = Stock.objects.get_or_create(produit=instance.produit, defaults={'quantite': Decimal('0')})
    if instance.type in ['ENTREE_MANUELLE', 'ENTREE_ACHAT']:
        Stock.objects.filter(id=stock.id).update(quantite=F('quantite') + instance.quantite)
    elif instance.type == 'AJUSTEMENT': 
        Stock.objects.filter(id=stock.id).update(quantite=instance.quantite)
    elif instance.type in ['SORTIE_MANUELLE', 'SORTIE_VENTE']:
        stock.refresh_from_db()
        if stock.quantite < instance.quantite: raise ValidationError(f"Stock insuffisant")
        Stock.objects.filter(id=stock.id).update(quantite=F('quantite') - instance.quantite)