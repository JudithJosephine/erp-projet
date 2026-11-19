from rest_framework import serializers
from .models import User
from .models import Permission, RolePermission

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True) # ataovy required=True

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name", 
            "telephone", "role", "password", "is_active"
        ]
        extra_kwargs = {
            'role': {'required': False}, # tsy obligatoire
            'email': {'required': False},
        }

    def create(self, validated_data):
        password = validated_data.pop('password')
        role_name = validated_data.pop('role', None) # <-- IZAO NO ZAVA-DEHIBE

        user = User.objects.create_user(password=password, **validated_data)
        
        if role_name: # raha nisy role no nandefa
            user.role = role_name 
            
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        role_name = validated_data.pop("role", None) # <-- sy eto koa

        request = self.context.get("request")

        if request and request.user.role != "ADMIN":
            validated_data.pop("role", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)
            
        if role_name:
            instance.role = role_name

        instance.save()
        return instance
    

class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["id", "name", "code", "description"]

class RolePermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RolePermission
        fields = ["id", "role", "permission"]