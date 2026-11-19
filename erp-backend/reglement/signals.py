from django.db.models.signals import post_save
from django.dispatch import receiver
from vente.models import BonLivraison, CommandeClient
from .models import FactureClient
from django.db import transaction

