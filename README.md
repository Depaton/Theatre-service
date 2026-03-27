# 🎭 Theatre Service API

A high-performance Theater Ticket Booking system designed for modern stage productions. This project showcases the integration of Django REST Framework with professional security, performance, and API design standards.

## ✨ Key Features

- **Dynamic Catalog**: Manage plays, actors, genres, and performances with a full CRUD interface.
- **Advanced Booking System**: Real-time seat reservation with row/seat validation.
- **Professional Documentation**: Fully interactive API documentation using Swagger UI and ReDoc.
- **Media Management**: Integrated support for actor photos and play posters using Cloud Storage readiness.
- **Automated Calculations**: Dynamic seat configuration and price calculation logic.

## 🛡️ Security & Protection

This project is built with production-grade security standards:

- **🔐 JWT Stateless Authentication**: Modern secure access via `djangorestframework-simplejwt`.
- **🚦 Intelligent Throttling**: Protects from API abuse with configurable rate limits for anonymous (100/day) and authenticated (1000/day) users.
- **📁 Environment-Driven Config**: Complete separation of secrets from code using `.env` (powered by `python-dotenv`).
- **🛡️ Shielded Headers**: 
  - `X-Frame-Options: DENY` (Anti-Clickjacking)
  - `X-Content-Type-Options: nosniff` (Anti-MIME Sniffing)
  - `SecurityMiddleware` enabled for production-ready cross-site scripting (XSS) filtering.
- **🌐 Cross-Origin Strategy**: Granular control over allowed domains via `django-cors-headers`.
- **✅ Atomic Validation**: Deep model and serializer validation to prevent data corruption and injection.

## 🛠️ Technology Stack

- **Backend**: Python, Django, DRF
- **Database**: PostgreSQL (Development uses SQLite for simplicity)
- **Security**: JWT, Throttling, CORS, CSRF
- **Testing**: PyTest with Django-specific extensions

## 🚀 Quick Start

1. **Environment Setup**:
   ```bash
   pip install -r requirements.txt
   cp .env.example .env  # Manual setup of the .env file
   # Generate a secret key or use the default for development
   ```
2. **Database Initialization**:
   ```bash
   python manage.py migrate
   python manage.py createsuperuser  # Recommended for admin access
   ```
3. **Run Application**:
   ```bash
   python manage.py runserver
   ```

## 🧪 Reviewing & Testing (For Mentors)

To run the automated test suite (ensure `pytest` is installed):

```bash
pytest
# OR
python manage.py test
```

### ⚡ Performance & Benchmarking

The project includes custom management commands to verify database scalability:

1.  **Seed Data**: `python manage.py seed_db` (Fills DB with thousands of records).
2.  **Benchmark**: `python manage.py check_performance` (Measures query execution time).

*Latest Benchmark Results:*
- Listing 100+ Performances: **~0.006s** (including `Count` annotations)
- Listing 20+ Plays with Actors/Genres: **~0.004s** (optimized with `prefetch_related`)

To efficiently review the security and functionality of this API:

1.  **Interactive Docs**: Navigate to `/api/schema/swagger-ui/` to explore and test all endpoints directly.
2.  **JWT Flow**: 
    - Get token via `POST /api/token/` using valid credentials.
    - Authorize in Swagger using the `Bearer <token>` format.
3.  **Security Checks**:
    - Attempt an unauthorized reservation to test `IsAuthenticated` permissions.
    - Perform multiple rapid requests to see **Throttling** in action (returns 429 after limits are reached).
    - Check `settings.py` for environment-driven configuration and security middleware.
4.  **Admin Panel**: Access `/admin/` for manual data management (requires superuser).

This is a new Python project.
