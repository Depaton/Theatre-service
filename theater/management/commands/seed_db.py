import random
from datetime import datetime, timedelta, timezone
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from theater.models import Genre, Actor, Play, TheatreHall, Performance, Reservation, Ticket

class Command(BaseCommand):
    help = 'Seeds the database with dummy data for performance testing'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database...')
        
        # Clear existing data (optional, but good for clean tests)
        # Ticket.objects.all().delete()
        # Reservation.objects.all().delete()
        # Performance.objects.all().delete()
        
        genres = ['Drama', 'Comedy', 'Thriller', 'Musicals', 'Sci-Fi']
        genre_objs = [Genre.objects.get_or_create(name=n)[0] for n in genres]
        
        rooms = ['Main Stage', 'Small Stage', 'Experimental Hall', 'Open Air']
        hall_objs = [TheatreHall.objects.get_or_create(name=n, defaults={'rows': 20, 'seats_in_row': '25'})[0] for n in rooms]
        
        plays_titles = [f"Amazing Play {i}" for i in range(20)]
        play_objs = []
        for title in plays_titles:
            p, created = Play.objects.get_or_create(title=title, defaults={'description': 'A very interesting play.'})
            p.genres.add(random.choice(genre_objs))
            play_objs.append(p)
            
        # Create many performances
        self.stdout.write(f'Creating 100 performances...')
        perf_objs = []
        now = datetime.now(timezone.utc)
        for i in range(100):
            perf = Performance.objects.create(
                play=random.choice(play_objs),
                theatre_hall=random.choice(hall_objs),
                show_time=now + timedelta(days=random.randint(1, 30), hours=random.randint(1, 12))
            )
            perf_objs.append(perf)
            
        # Create many reservations and thousands of tickets
        self.stdout.write(f'Creating 1000 tickets...')
        user = get_user_model().objects.first() or get_user_model().objects.create_user(username='tester', password='pw')
        
        for _ in range(50):
            res = Reservation.objects.create(user=user)
            perf = random.choice(perf_objs)
            # Add 20 tickets per reservation, with unique row/seat logic
            booked_seats = set(Ticket.objects.filter(performance=perf).values_list('row', 'seat'))
            for _ in range(20):
                r, s = random.randint(1, 20), random.randint(1, 25)
                while (r, s) in booked_seats:
                    r, s = random.randint(1, 20), random.randint(1, 25)
                
                Ticket.objects.create(
                    reservation=res,
                    performance=perf,
                    row=r,
                    seat=s
                )
                booked_seats.add((r, s))
        
        self.stdout.write(self.style.SUCCESS(f'Successfully seeded with {Play.objects.count()} plays, {Performance.objects.count()} performances, and {Ticket.objects.count()} tickets.'))
