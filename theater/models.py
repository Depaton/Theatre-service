from django.db import models
from django.conf import settings

# class Performance(models.Model):
#     title = models.CharField(max_length=255)
#     description = models.TextField()
#     duration = models.IntegerField()


class Genre(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name


class Actor(models.Model):
    first_name = models.CharField(max_lenght=255, unique=False)
    last_name = models.CharField(max_lenght=255, unique=False)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class Play(models.Model):
    title = models.CharField(max_lenght=255, unique=True)
    description = models.TextField()
    actors = models.ManyToManyField(Actor)
    genres = models.ManyToManyField(Genre)


    def __str__(self):
        return f"{self.title},
                {self.description},
                {self.genres},
                {self.actors}"

class Reservation(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reservations"
    ) 

    def __str__(self):
        return f"Reservation by {self.user.username} at {self.created_at}"


class TheatereHall(models.Model):
    name = models.CharField(max_lenght=255, unique=True)
    rows = models.IntegerField()
    seats_in_row = models.IntegerField()

    def __str__(self):
        return f"{self.name},seats in Hall {self.rows * self.seats_in_row}"


class Performance(models.Model):
    play = models.ManyToOneRel(Play)
    theatre_hall = models.ManyToOneRel(TheatereHall)
    show_time = models.DateTimeField()


    def __str__(self):
        return f"{self.play}, {self.theatre_hall}, {self.show_time}"

class Ticket(models.Model):
    raw = models.IntegerField()
    seat = models.IntegerField()
    performance = models.ManyToOneRel(Performance)
    reservation = models.ManyToOneRel(Reservation)

    def __str__(self):
        return f"{self.performance}, {self.reservation}, {self.raw}, {self.seat}"
