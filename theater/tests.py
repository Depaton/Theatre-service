from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import datetime, timedelta, timezone

from theater.models import Genre, Actor, Play, TheatreHall, Performance, Reservation, Ticket


class TheatreApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='testuser',
            password='testpassword'
        )
        self.admin = get_user_model().objects.create_superuser(
            username='admin',
            password='adminpassword'
        )
        self.genre = Genre.objects.create(name="Drama")
        self.actor = Actor.objects.create(first_name="John", last_name="Doe")
        self.hall = TheatreHall.objects.create(name="Main Hall", rows=10, seats_in_row="10")
        self.play = Play.objects.create(title="Hamlet", description="Trazy play")
        self.play.genres.add(self.genre)
        self.play.actors.add(self.actor)
        
        self.performance = Performance.objects.create(
            play=self.play,
            theatre_hall=self.hall,
            show_time=datetime.now(timezone.utc) + timedelta(days=1)
        )
        
        self.token = RefreshToken.for_user(self.user).access_token

    def test_unauthenticated_access_list_is_allowed(self):
        """Guests should see the plays and performances (ReadOnly)."""
        url = reverse('theatre:play-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthenticated_create_is_forbidden(self):
        """Guests cannot create a new Play."""
        url = reverse('theatre:play-list')
        response = self.client.post(url, {'title': 'Macbeth'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_can_create_play(self):
        """Admin user can create a play."""
        self.client.force_authenticate(user=self.admin)
        url = reverse('theatre:play-list')
        data = {
            'title': 'Macbeth',
            'description': 'Shakespeare classic',
            'actors': [self.actor.id],
            'genres': [self.genre.id]
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_user_can_reserve_ticket(self):
        """Regular user can create a reservation (requires token)."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        res_url = reverse('theatre:reservation-list')
        res_data = {} # Body can be empty for reservation
        response = self.client.post(res_url, res_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        res_id = response.data['id']
        
        # Now create a ticket for that reservation
        ticket_url = reverse('theatre:ticket-list')
        ticket_data = {
            'row': 1,
            'seat': 1,
            'performance': self.performance.id,
            'reservation': res_id
        }
        response = self.client.post(ticket_url, ticket_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_seat_validation_invalid_row(self):
        """Validation: Row must exist in hall."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        res = self.client.post(reverse('theatre:reservation-list'), {})
        
        ticket_data = {
            'row': 99, # Hall only has 10
            'seat': 1,
            'performance': self.performance.id,
            'reservation': res.data['id']
        }
        response = self.client.post(reverse('theatre:ticket-list'), ticket_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Ряд 99 не існує', str(response.data))

    def test_seat_overlap_forbidden(self):
        """Validation: One seat cannot be booked twice for same performance."""
        # 1. Create first ticket
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        res = self.client.post(reverse('theatre:reservation-list'), {})
        self.client.post(reverse('theatre:ticket-list'), {
            'row': 5, 'seat': 5, 'performance': self.performance.id, 'reservation': res.data['id']
        })
        
        # 2. Try to book EXACT SAME seat again
        res2 = self.client.post(reverse('theatre:reservation-list'), {})
        response = self.client.post(reverse('theatre:ticket-list'), {
            'row': 5, 'seat': 5, 'performance': self.performance.id, 'reservation': res2.data['id']
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Accept either our custom message or DRF default
        error_text = str(response.data)
        self.assertTrue('already taken' in error_text or 'must make a unique set' in error_text)


    def test_jwt_token_flow(self):
        """Verify tokens works for private endpoints."""
        token_url = reverse('token_obtain_pair')
        response = self.client.post(token_url, {
            'username': 'testuser',
            'password': 'testpassword'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        access_token = response.data['access']
        
        # Test access with this token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get(reverse('theatre:reservation-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

