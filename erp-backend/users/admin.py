from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User





@admin.register(User)
class CustomUserAdmin(UserAdmin):

    list_display = (
        "username",
        "email",
        "role",
        "telephone",
        "is_active",
        "is_staff",
    )

    fieldsets = UserAdmin.fieldsets + (
        (
            "ERP",
            {
                "fields": (
                    "role",
                    "telephone",
                )
            },
        ),
    )