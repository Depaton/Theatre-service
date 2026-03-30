from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

class Genre(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name


class Actor(models.Model):
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    photo = models.ImageField(upload_to='actors/', blank=True, null=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class Play(models.Model):
    title = models.CharField(max_length=255, unique=True)
    description = models.TextField()
    image = models.ImageField(upload_to='plays/', blank=True, null=True)
    actors = models.ManyToManyField(Actor)
    genres = models.ManyToManyField(Genre)

    def __str__(self):
        return self.title


class Reservation(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reservations"
    ) 

    def __str__(self):
        return f"Reservation by {self.user.username} at {self.created_at}"


class TheatreHall(models.Model):
    name = models.CharField(max_length=255, unique=True)
    rows = models.IntegerField()
    # Now stores either a single number or a comma-separated list of numbers (one for each row)
    seats_in_row = models.CharField(max_length=255, help_text="Number of seats per row (single number for all rows or comma-separated list for each row).")

    @property
    def seats_config(self):
        """Returns a list of seat counts per row."""
        try:
            parts = [int(x.strip()) for x in self.seats_in_row.split(',') if x.strip()]
            if len(parts) == 1:
                return [parts[0]] * self.rows
            return parts
        except (ValueError, TypeError):
            return []

    def __str__(self):
        total_seats = sum(self.seats_config)
        return f"{self.name} (Total Capacity: {total_seats})"


class Performance(models.Model):
    play = models.ForeignKey(Play, on_delete=models.CASCADE)
    theatre_hall = models.ForeignKey(TheatreHall, on_delete=models.CASCADE)
    show_time = models.DateTimeField()

    def __str__(self):
        return f"{self.play.title} at {self.theatre_hall.name} - {self.show_time}"


class Ticket(models.Model):
    row = models.IntegerField()
    seat = models.IntegerField()
    performance = models.ForeignKey(Performance, on_delete=models.CASCADE, related_name="tickets")
    reservation = models.ForeignKey(Reservation, on_delete=models.CASCADE, related_name="tickets")

    class Meta:
        unique_together = ("performance", "row", "seat")

    def clean(self):
        """Validate that row and seat are within the hall's configuration."""
        hall = self.performance.theatre_hall
        config = hall.seats_config
        
        if self.row < 1 or self.row > hall.rows:
            raise ValidationError(f"Ряд {self.row} не існує в цьому залі (у залі {hall.rows} рядів).")
        
        if self.row > len(config):
             raise ValidationError(f"Конфігурація для ряду {self.row} не знайдена.")
             
        max_seats = config[self.row - 1]
        if self.seat < 1 or self.seat > max_seats:
            raise ValidationError(f"Місце {self.seat} не існує в ряду {self.row} (у ряду {max_seats} місць).")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Ticket for {self.performance}: Row {self.row}, Seat {self.seat}"

