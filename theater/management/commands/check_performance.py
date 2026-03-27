import time
from django.core.management.base import BaseCommand
from django.db import connection, reset_queries
from theater.models import Performance, Play, Ticket, Actor
from django.db.models import Count

class Command(BaseCommand):
    help = 'Measures the performance of common database queries'

    def handle(self, *args, **options):
        self.stdout.write('--- Database Performance Benchmark ---')
        
        # 1. Performance List (with annotations)
        reset_queries()
        start = time.time()
        # Initial QuerySet (as it is now in views.py)
        qs = Performance.objects.all().annotate(tickets_count=Count('tickets'))
        count = list(qs) # Force evaluation
        end = time.time()
        
        self.stdout.write(self.style.SUCCESS(
            f'1. Listing {len(count)} Performances (current): {end - start:.4f}s'
        ))
        self.stdout.write(f'   Queries executed: {len(connection.queries)}')
        
        # 2. Performance List (OPTIMIZED with select_related)
        reset_queries()
        start = time.time()
        qs_opt = Performance.objects.select_related('play', 'theatre_hall').annotate(tickets_count=Count('tickets'))
        count_opt = list(qs_opt)
        for p in count_opt:
            # We access related fields as we would in a real serializer
            _ = p.play.title
            _ = p.theatre_hall.name
        end = time.time()
        
        self.stdout.write(self.style.SUCCESS(
            f'2. Listing {len(count_opt)} Performances (Optimized): {end - start:.4f}s'
        ))
        self.stdout.write(f'   Queries executed: {len(connection.queries)}')

        # 3. Play List (Many-to-Many check)
        reset_queries()
        start = time.time()
        qs_plays = Play.objects.prefetch_related('actors', 'genres').all()
        count_p = list(qs_plays)
        for p in count_p:
            _ = list(p.actors.all())
            _ = list(p.genres.all())
        end = time.time()
        
        self.stdout.write(self.style.SUCCESS(
            f'3. Listing {len(count_p)} Plays (with Prefetch): {end - start:.4f}s'
        ))
        self.stdout.write(f'   Queries executed: {len(connection.queries)}')
        
        self.stdout.write('\n--- Conclusion ---')
        if end - start < 1.0:
            self.stdout.write('Database speed is EXCELLENT for this amount of data.')
        else:
            self.stdout.write('Consider adding database indexes or further optimization.')
