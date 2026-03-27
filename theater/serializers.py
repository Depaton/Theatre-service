from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Genre, Actor, Play, TheatreHall, Performance, Reservation, Ticket

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ("id", "username", "email", "password", "is_staff")
        read_only_fields = ("is_staff",)
        extra_kwargs = {"password": {"write_only": True, "min_length": 5}}

    def create(self, validated_data):
        """Create a new user with encrypted password and return it"""
        return get_user_model().objects.create_user(**validated_data)

    def update(self, instance, validated_data):
        """Update a user, set the password correctly and return it"""
        password = validated_data.pop("password", None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save()

        return user

class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ("id", "name")

class ActorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Actor
        fields = ("id", "first_name", "last_name", "photo")

class TheatreHallSerializer(serializers.ModelSerializer):
    class Meta:
        model = TheatreHall
        fields = ("id", "name", "rows", "seats_in_row", "seats_config")
        read_only_fields = ("seats_config",)

class PlaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Play
        fields = ("id", "title", "description", "image", "actors", "genres")

class PerformanceSerializer(serializers.ModelSerializer):
    tickets_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Performance
        fields = ("id", "play", "theatre_hall", "show_time", "tickets_count")
        read_only_fields = ("tickets_count",)

class TicketSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        """
        Validates that the ticket's row and seat are within the hall's configuration 
        and that the seat is not already taken.
        """
        # We create a temporary instance to use the model's clean() logic
        try:
            data = Ticket(**attrs)
            data.full_clean() # This will call the model's clean() method
        except ValidationError as error:
            raise serializers.ValidationError(error.messages)

        # Check if unique_together is violated manually for better error message
        if Ticket.objects.filter(
            performance=attrs['performance'],
            row=attrs['row'],
            seat=attrs['seat']
        ).exists():
            raise serializers.ValidationError(
                f"Seat {attrs['seat']} in row {attrs['row']} is already taken for this performance."
            )

        return attrs

    class Meta:
        model = Ticket
        fields = ("id", "row", "seat", "performance", "reservation")

class ReservationSerializer(serializers.ModelSerializer):
    tickets = TicketSerializer(many=True, read_only=True)

    class Meta:
        model = Reservation
        fields = ("id", "created_at", "user", "tickets")
        read_only_fields = ("user",)
