from rest_framework import viewsets, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .permissions import IsAdminOrReadOnly
from .models import Genre, Actor, Play, TheatreHall, Performance, Reservation, Ticket
from .serializers import (
    GenreSerializer, ActorSerializer, PlaySerializer,
    TheatreHallSerializer, PerformanceSerializer,
    ReservationSerializer, TicketSerializer,
    UserSerializer
)

class CreateUserView(generics.CreateAPIView):
    serializer_class = UserSerializer
    permission_classes = (AllowAny,)

class ManageUserView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = (IsAuthenticated,)

    def get_object(self):
        return self.request.user

class GenreViewSet(viewsets.ModelViewSet):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer
    permission_classes = [IsAdminOrReadOnly]

class ActorViewSet(viewsets.ModelViewSet):
    queryset = Actor.objects.all()
    serializer_class = ActorSerializer
    permission_classes = [IsAdminOrReadOnly]

class TheatreHallViewSet(viewsets.ModelViewSet):
    queryset = TheatreHall.objects.all()
    serializer_class = TheatreHallSerializer
    permission_classes = [IsAdminOrReadOnly]

class PlayViewSet(viewsets.ModelViewSet):
    queryset = Play.objects.all().prefetch_related('actors', 'genres')
    serializer_class = PlaySerializer
    permission_classes = [IsAdminOrReadOnly]

from django.db.models import Count
# ...
class PerformanceViewSet(viewsets.ModelViewSet):
    queryset = Performance.objects.all().select_related('play', 'theatre_hall').annotate(tickets_count=Count('tickets'))
    serializer_class = PerformanceSerializer
    permission_classes = [IsAdminOrReadOnly]

    @action(detail=True, methods=['get'], permission_classes=[AllowAny], url_path='taken-seats')
    def taken_seats(self, request, pk=None):
        """Return all taken row/seat pairs for this performance."""
        tickets = Ticket.objects.filter(performance_id=pk).values_list('row', 'seat')
        return Response([{'row': r, 'seat': s} for r, s in tickets])

class ReservationViewSet(viewsets.ModelViewSet):
    queryset = Reservation.objects.all()
    serializer_class = ReservationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Reservation.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Ticket.objects.filter(reservation__user=self.request.user)

    def perform_destroy(self, instance):
        reservation = instance.reservation
        instance.delete()
        # If this was the last ticket in the reservation, delete the reservation too
        if reservation.tickets.count() == 0:
            reservation.delete()
