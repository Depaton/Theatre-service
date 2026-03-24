/* ========================================
   API Service — Театральна Каса
   Communicates with Django REST API
   ======================================== */

const API_BASE = 'http://127.0.0.1:8000/api/theater';

const api = {
    // --- Auth token storage ---
    getToken() {
        return localStorage.getItem('theater_token');
    },
    setToken(token) {
        localStorage.setItem('theater_token', token);
    },
    clearToken() {
        localStorage.removeItem('theater_token');
    },
    getUser() {
        const data = localStorage.getItem('theater_user');
        return data ? JSON.parse(data) : null;
    },
    setUser(user) {
        localStorage.setItem('theater_user', JSON.stringify(user));
    },
    clearUser() {
        localStorage.removeItem('theater_user');
    },

    // --- Request helper ---
    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Token ${token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error = new Error(
                errorData.detail || Object.values(errorData).flat().join(', ') || `HTTP ${response.status}`
            );
            error.status = response.status;
            error.data = errorData;
            throw error;
        }

        if (response.status === 204) return null;
        return response.json();
    },

    // --- Auth ---
    async register(username, email, password) {
        const data = await this.request('/register/', {
            method: 'POST',
            body: JSON.stringify({ username, email, password }),
        });
        return data;
    },

    // We use Django session / basic auth for simplicity
    // Storing credentials for session-based auth
    async login(username, password) {
        // Try to authenticate by fetching user profile with basic auth
        const credentials = btoa(`${username}:${password}`);
        const url = `${API_BASE}/me/`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Неправильне ім\'я користувача або пароль');
        }

        const user = await response.json();
        // Store credentials for future requests
        this._credentials = credentials;
        localStorage.setItem('theater_credentials', credentials);
        this.setUser(user);
        return user;
    },

    // Override request for basic auth
    async requestAuth(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const credentials = localStorage.getItem('theater_credentials');
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (credentials) {
            headers['Authorization'] = `Basic ${credentials}`;
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error = new Error(
                errorData.detail || Object.values(errorData).flat().join(', ') || `HTTP ${response.status}`
            );
            error.status = response.status;
            error.data = errorData;
            throw error;
        }

        if (response.status === 204) return null;
        return response.json();
    },

    logout() {
        localStorage.removeItem('theater_credentials');
        this.clearUser();
    },

    isLoggedIn() {
        return !!localStorage.getItem('theater_credentials');
    },

    // --- Performances ---
    async getPerformances() {
        return this.request('/performances/');
    },

    // --- Plays ---
    async getPlays() {
        return this.request('/plays/');
    },

    async getPlay(id) {
        return this.request(`/plays/${id}/`);
    },

    // --- Theatre Halls ---
    async getTheatreHalls() {
        return this.request('/theatre_halls/');
    },

    async getTheatreHall(id) {
        return this.request(`/theatre_halls/${id}/`);
    },

    // --- Genres ---
    async getGenres() {
        return this.request('/genres/');
    },

    // --- Actors ---
    async getActors() {
        return this.request('/actors/');
    },

    // --- Reservations ---
    async getReservations() {
        return this.requestAuth('/reservations/');
    },

    async createReservation() {
        return this.requestAuth('/reservations/', {
            method: 'POST',
            body: JSON.stringify({}),
        });
    },

    // --- Tickets ---
    async getTickets() {
        return this.requestAuth('/tickets/');
    },

    async getTicketsForPerformance(performanceId) {
        // Public endpoint that returns taken row/seat pairs
        return this.request(`/performances/${performanceId}/taken-seats/`);
    },

    async deleteReservation(id) {
        return this.requestAuth(`/reservations/${id}/`, {
            method: 'DELETE',
        });
    },

    async deleteTicket(id) {
        return this.requestAuth(`/tickets/${id}/`, {
            method: 'DELETE',
        });
    },

    async adminSaveMultipart(endpoint, id, formData) {
        const method = id ? 'PATCH' : 'POST'; // Use PATCH for updates with files to avoid clearing other fields
        const url = id ? `${endpoint}${id}/` : endpoint;
        const credentials = localStorage.getItem('theater_credentials');
        
        const response = await fetch(`${API_BASE}${url}`, {
            method,
            headers: {
                'Authorization': `Basic ${credentials}`,
                // Browser automatically sets Content-Type to multipart/form-data with boundary
            },
            body: formData,
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(Object.values(err).flat().join(', ') || 'Помилка сервера');
        }
        return response.json();
    },

    async adminDelete(endpoint, id) {
        return this.requestAuth(`${endpoint}${id}/`, {
            method: 'DELETE',
        });
    },
};
