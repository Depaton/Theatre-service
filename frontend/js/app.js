/* ========================================
   App Logic — Театральна Каса
   ======================================== */

// ===== State =====
const state = {
    performances: [],
    plays: {},
    halls: {},
    genres: {},
    actors: {},
    currentPerformance: null,
    selectedSeats: [],
    takenSeats: [],
    adminTab: 'performances',
    adminEditingId: null,
    filters: {
        text: '',
        date: '',
        genre: ''
    }
};

// ===== DOM Elements =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== Aesthetic helpers =====
const cardGradients = [
    'linear-gradient(135deg, #1a0a14 0%, #2d1425 50%, #0d0d12 100%)',
    'linear-gradient(135deg, #0d1a2d 0%, #1a2d42 50%, #0d0d12 100%)',
    'linear-gradient(135deg, #1a1a0d 0%, #2d2d1a 50%, #0d0d12 100%)',
    'linear-gradient(135deg, #0d1a1a 0%, #1a2d2d 50%, #0d0d12 100%)',
    'linear-gradient(135deg, #1a0d1a 0%, #2d1a2d 50%, #0d0d12 100%)',
    'linear-gradient(135deg, #1a140d 0%, #2d251a 50%, #0d0d12 100%)',
];

const theatreIcons = ['🎭', '🎪', '🎬', '🎶', '🎻', '💃', '🎹', '🌹', '✨', '🕯️'];

function formatDate(dateStr) {
    const d = new Date(dateStr);
    const options = {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    };
    return d.toLocaleDateString('uk-UA', options);
}

// ===== Toast =====
function showToast(message, type = 'info') {
    const container = $('#toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(60px)';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// ===== Navigation =====
function showPage(pageId, updateHash = true) {
    $$('.page').forEach(p => p.classList.remove('active'));
    const page = $(`#page-${pageId}`);
    if (page) page.classList.add('active');

    $$('.nav-link').forEach(l => l.classList.remove('active'));
    $$(`.nav-link[data-page="${pageId}"]`).forEach(l => l.classList.add('active'));

    if (updateHash) {
        location.hash = pageId;
    }

    if (pageId === 'my-tickets') loadMyReservations();
    if (pageId === 'admin') loadAdminTab(state.adminTab);

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Handle browser Back/Forward or Hash changes
window.addEventListener('hashchange', () => {
    const page = location.hash.replace('#', '') || 'home';
    showPage(page, false);
});

// ===== Auth UI =====
let isRegisterMode = false;

function updateAuthUI() {
    const authContainer = $('#nav-auth');
    if (api.isLoggedIn()) {
        const user = api.getUser();
        authContainer.innerHTML = `
            <div class="user-dropdown" id="user-dropdown">
                <button class="btn btn-ghost btn-sm user-dropdown-trigger" id="user-dropdown-trigger">
                    👤 ${user?.username || 'User'} ▾
                </button>
                <div class="dropdown-menu" id="dropdown-menu">
                    <a href="#" class="dropdown-item" id="menu-my-tickets">🎫 Мої Квитки</a>
                    <a href="#" class="dropdown-item" id="menu-profile">⚙️ Налаштування</a>
                    ${user?.is_staff ? `<a href="#" class="dropdown-item" id="menu-admin">🛡️ Панель Адміна</a>` : ''}
                    <div class="dropdown-divider"></div>
                    <a href="#" class="dropdown-item dropdown-item-danger" id="menu-logout">🚪 Вийти</a>
                </div>
            </div>
        `;
        $('#user-dropdown-trigger').addEventListener('click', (e) => {
            e.stopPropagation();
            $('#dropdown-menu').classList.toggle('open');
        });
        document.addEventListener('click', () => {
            $('#dropdown-menu')?.classList.remove('open');
        });
        $('#menu-my-tickets').addEventListener('click', (e) => {
            e.preventDefault();
            $('#dropdown-menu').classList.remove('open');
            showPage('my-tickets');
        });
        $('#menu-profile').addEventListener('click', (e) => {
            e.preventDefault();
            $('#dropdown-menu').classList.remove('open');
            openProfileModal();
        });
        $('#menu-admin')?.addEventListener('click', (e) => {
            e.preventDefault();
            $('#dropdown-menu').classList.remove('open');
            showPage('admin');
        });
        $('#menu-logout').addEventListener('click', (e) => {
            e.preventDefault();
            $('#dropdown-menu').classList.remove('open');
            api.logout();
            updateAuthUI();
            showToast('Ви вийшли з акаунту', 'info');
            if ($('#page-my-tickets').classList.contains('active')) {
                showPage('home');
            }
        });
    } else {
        authContainer.innerHTML = `
            <button class="btn btn-ghost btn-sm" id="register-btn">Реєстрація</button>
            <button class="btn btn-outline btn-sm" id="login-btn">Увійти</button>
        `;
        $('#login-btn').addEventListener('click', () => openAuthModal(false));
        $('#register-btn').addEventListener('click', () => openAuthModal(true));
    }
}

// ===== Profile Modal =====
function openProfileModal() {
    const user = api.getUser();
    if (!user) return;

    const modal = $('#auth-modal');
    modal.classList.add('active');

    $('#modal-title').textContent = 'Налаштування Профілю';
    $('#email-group').style.display = 'block';
    $('#username-group').style.display = 'block';
    $('#password-repeat-group').style.display = 'block';
    $('#auth-username').value = user.username || '';
    $('#auth-email').value = user.email || '';
    $('#auth-password').value = '';
    $('#auth-password').required = false;
    $('#auth-submit').textContent = 'Зберегти';
    $('#form-error').textContent = '';
    $('#modal-switch').innerHTML = '';

    // Mark as profile mode
    isRegisterMode = false;
    modal.dataset.mode = 'profile';
}

function openAuthModal(registerMode = false) {
    isRegisterMode = registerMode;
    const modal = $('#auth-modal');
    modal.dataset.mode = ''; // Reset profile mode
    modal.classList.add('active');

    $('#modal-title').textContent = registerMode ? 'Реєстрація' : 'Вхід';
    $('#email-group').style.display = registerMode ? 'block' : 'none';
    $('#password-repeat-group').style.display = registerMode ? 'block' : 'none';
    $('#auth-password-repeat').required = registerMode;
    
    $('#auth-submit').textContent = registerMode ? 'Зареєструватися' : 'Увійти';
    $('#switch-auth').textContent = registerMode ? 'Увійти' : 'Зареєструватися';
    $('#modal-switch').innerHTML = registerMode
        ? 'Вже маєте акаунт? <a href="#" id="switch-auth">Увійти</a>'
        : 'Немає акаунту? <a href="#" id="switch-auth">Зареєструватися</a>';

    $('#form-error').textContent = '';
    $('#auth-form').reset();

    $('#switch-auth').addEventListener('click', (e) => {
        e.preventDefault();
        openAuthModal(!registerMode);
    });
}

function closeAuthModal() {
    $('#auth-modal').classList.remove('active');
}

// ===== Confirmation Modal =====
let confirmCallback = null;
function openConfirmModal(text, onConfirm) {
    $('#confirm-text').textContent = text;
    confirmCallback = onConfirm;
    $('#confirm-modal').classList.add('active');
}

function closeConfirmModal() {
    $('#confirm-modal').classList.remove('active');
    confirmCallback = null;
}

// ===== Load Data =====
async function loadAllData() {
    try {
        const [performances, plays, halls, genres, actors] = await Promise.all([
            api.getPerformances(),
            api.getPlays(),
            api.getTheatreHalls(),
            api.getGenres(),
            api.getActors(),
        ]);

        state.performances = Array.isArray(performances) ? performances : performances.results || [];
        const playList = Array.isArray(plays) ? plays : plays.results || [];
        const hallList = Array.isArray(halls) ? halls : halls.results || [];
        const genreList = Array.isArray(genres) ? genres : genres.results || [];
        const actorList = Array.isArray(actors) ? actors : actors.results || [];

        playList.forEach(p => state.plays[p.id] = p);
        hallList.forEach(h => state.halls[h.id] = h);
        genreList.forEach(g => state.genres[g.id] = g);
        actorList.forEach(a => state.actors[a.id] = a);
 
        // Populate search dropdowns
        const genreSelect = $('#search-genre');
        if (genreSelect) {
            genreSelect.innerHTML = '<option value="">Усі жанри</option>' + 
                genreList.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
        }

        initSearch();
        renderPerformances();
    } catch (err) {
        console.error('Load data error:', err);
        $('#performance-grid').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <p>Не вдалося завантажити дані. Перевірте, чи запущено сервер.</p>
                <button class="btn btn-outline" onclick="loadAllData()">Спробувати знову</button>
            </div>
        `;
    }
}

// ===== Render Performances =====
function renderPerformances() {
    const grid = $('#performance-grid');
    
    // Filtering logic
    const filtered = state.performances.filter(perf => {
        const play = state.plays[perf.play] || {};
        const matchesText = !state.filters.text || 
            play.title?.toLowerCase().includes(state.filters.text.toLowerCase()) || 
            (play.actors || []).some(aId => {
                const actor = state.actors[aId];
                return actor && (actor.first_name + ' ' + actor.last_name).toLowerCase().includes(state.filters.text.toLowerCase());
            });
            
        const matchesDate = !state.filters.date || perf.show_time.startsWith(state.filters.date);
        
        const matchesGenre = !state.filters.genre || (play.genres || []).includes(parseInt(state.filters.genre));

        return matchesText && matchesDate && matchesGenre;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔎</div>
                <p>Нічого не знайдено за вашим запитом</p>
                <button class="btn btn-outline btn-sm" onclick="clearFilters()">Скинути пошук</button>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map((perf, i) => {
        const play = state.plays[perf.play] || {};
        const hall = state.halls[perf.theatre_hall] || {};
        const gradient = cardGradients[i % cardGradients.length];
        const icon = theatreIcons[i % theatreIcons.length];
        const totalSeats = (hall.seats_config || []).reduce((a, b) => a + b, 0);

        const playImage = play.image ? `<img src="${play.image}" alt="${play.title}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;">` : `<span style="font-size: 3.5rem; position: relative; z-index: 1; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));">${icon}</span>`;

        const tickets_taken = perf.tickets_count || 0;
        const remaining = totalSeats - tickets_taken;

        return `
            <div class="perf-card" data-perf-id="${perf.id}" style="animation-delay: ${i * 0.08}s">
                <div class="perf-card-visual" style="background: ${gradient}">
                    ${playImage}
                </div>
                <div class="perf-card-body">
                    <h3 class="perf-card-title">${play.title || 'Вистава'}</h3>
                    <p class="perf-card-hall">🏛️ ${hall.name || 'Зал'}</p>
                    <p class="perf-card-date">📅 ${formatDate(perf.show_time)}</p>
                </div>
                <div class="perf-card-footer">
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <span class="perf-card-seats" style="margin-left:0;">💺 ${totalSeats} місць</span>
                        <span style="font-size:0.75rem; color:${remaining > 0 ? 'var(--accent)' : '#e74c3c'}; font-weight:600;">
                            ${remaining > 0 ? `🔥 Залишилось: ${remaining}` : '⛔ Місць немає'}
                        </span>
                    </div>
                    <span class="btn ${remaining > 0 ? 'btn-primary' : 'btn-ghost'} btn-sm">${remaining > 0 ? 'Обрати місця →' : 'Переглянути'}</span>
                </div>
            </div>
        `;
    }).join('');

    // Attach click handlers
    $$('.perf-card').forEach(card => {
        card.addEventListener('click', () => {
            const perfId = parseInt(card.dataset.perfId);
            openPerformanceDetail(perfId);
        });
    });
}

// ===== Performance Detail =====
async function openPerformanceDetail(perfId) {
    const perf = state.performances.find(p => p.id === perfId);
    if (!perf) return;

    state.currentPerformance = perf;
    state.selectedSeats = [];

    const play = state.plays[perf.play] || {};
    const hall = state.halls[perf.theatre_hall] || {};

    // Fill detail info
    $('#detail-title').textContent = play.title || 'Вистава';
    $('#detail-meta').textContent = `🏛️ ${hall.name || 'Зал'} · 📅 ${formatDate(perf.show_time)}`;
    $('#detail-description').textContent = play.description || 'Опис відсутній.';

    // Genres
    const genresHtml = (play.genres || []).map(gId => {
        const genre = state.genres[gId];
        return genre ? `<span class="tag">${genre.name}</span>` : '';
    }).join('');
    $('#detail-genres').innerHTML = genresHtml || '<span class="tag">Не вказано</span>';

    // Actors
    const actorsHtml = (play.actors || []).map(aId => {
        const actor = state.actors[aId];
        if (!actor) return '';
        const photoHtml = actor.photo
            ? `<img src="${actor.photo}" alt="${actor.first_name}" class="actor-photo">`
            : '';
        return `<span class="tag actor-tag">${photoHtml}${actor.first_name} ${actor.last_name}</span>`;
    }).join('');
    $('#detail-actors').innerHTML = actorsHtml || '<span class="tag">Не вказано</span>';

    // Load taken seats
    try {
        const takenData = await api.getTicketsForPerformance(perfId);
        const takenList = Array.isArray(takenData) ? takenData : [];
        state.takenSeats = takenList.map(t => `${t.row}-${t.seat}`);
    } catch {
        state.takenSeats = [];
    }

    // Build seat grid
    buildSeatGrid(hall.rows || 5, hall.seats_config || []);

    showPage('detail');
}

function buildSeatGrid(rows, seatsConfig) {
    const grid = $('#seat-grid');
    grid.innerHTML = '';

    // If seatsConfig is not an array or empty, try to fallback (should not happen with new API)
    const isConfigArray = Array.isArray(seatsConfig) && seatsConfig.length > 0;

    for (let r = 1; r <= rows; r++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'seat-row';

        const label = document.createElement('span');
        label.className = 'seat-row-label';
        label.textContent = r;
        rowDiv.appendChild(label);

        const currentSeatsInRow = isConfigArray ? (seatsConfig[r - 1] || 0) : 0;

        for (let s = 1; s <= currentSeatsInRow; s++) {
            const seatEl = document.createElement('div');
            seatEl.className = 'seat';
            seatEl.dataset.row = r;
            seatEl.dataset.seat = s;
            seatEl.title = `Ряд ${r}, Місце ${s}`;

            const seatKey = `${r}-${s}`;
            if (state.takenSeats.includes(seatKey)) {
                seatEl.classList.add('taken');
            } else {
                seatEl.addEventListener('click', () => toggleSeat(seatEl, r, s));
            }

            rowDiv.appendChild(seatEl);
        }

        const labelRight = document.createElement('span');
        labelRight.className = 'seat-row-label';
        labelRight.textContent = r;
        rowDiv.appendChild(labelRight);

        grid.appendChild(rowDiv);
    }

    updateBookingSummary();
}

function toggleSeat(el, row, seat) {
    const key = `${row}-${seat}`;
    const idx = state.selectedSeats.findIndex(s => s.key === key);

    if (idx > -1) {
        state.selectedSeats.splice(idx, 1);
        el.classList.remove('selected');
    } else {
        state.selectedSeats.push({ row, seat, key });
        el.classList.add('selected');
    }

    updateBookingSummary();
}

function updateBookingSummary() {
    const summary = $('#booking-summary');
    const count = $('#selected-count');

    if (state.selectedSeats.length > 0) {
        summary.style.display = 'block';
        count.textContent = state.selectedSeats.length;
    } else {
        summary.style.display = 'none';
    }
}

// ===== Search & Filtering =====
function initSearch() {
    const textInput = $('#search-text');
    const dateInput = $('#search-date');
    const genreSelect = $('#search-genre');
    const clearBtn = $('#search-clear');

    if (!textInput) return;

    textInput.addEventListener('input', (e) => {
        state.filters.text = e.target.value;
        renderPerformances();
    });

    dateInput.addEventListener('change', (e) => {
        state.filters.date = e.target.value;
        renderPerformances();
    });

    genreSelect.addEventListener('change', (e) => {
        state.filters.genre = e.target.value;
        renderPerformances();
    });

    clearBtn.addEventListener('click', () => {
        clearFilters();
    });
}

function clearFilters() {
    state.filters = { text: '', date: '', genre: '' };
    $('#search-text').value = '';
    $('#search-date').value = '';
    $('#search-genre').value = '';
    renderPerformances();
}

// ===== Booking =====
async function handleBooking() {
    if (!api.isLoggedIn()) {
        showToast('Будь ласка, увійдіть для бронювання', 'info');
        openAuthModal(false);
        return;
    }

    if (state.selectedSeats.length === 0) {
        showToast('Оберіть хоча б одне місце', 'info');
        return;
    }

    const bookBtn = $('#book-btn');
    bookBtn.textContent = 'Бронюю...';
    bookBtn.disabled = true;

    try {
        // 1. Create a reservation
        const reservation = await api.createReservation();

        // 2. Create tickets for each selected seat
        const ticketPromises = state.selectedSeats.map(s =>
            api.createTicket(s.row, s.seat, state.currentPerformance.id, reservation.id)
        );

        await Promise.all(ticketPromises);

        showToast(`Успішно заброньовано ${state.selectedSeats.length} місць! 🎉`, 'success');
        state.selectedSeats = [];

        // Refresh the seat map
        openPerformanceDetail(state.currentPerformance.id);
    } catch (err) {
        console.error('Booking error:', err);
        showToast(err.message || 'Помилка при бронюванні', 'error');
    } finally {
        bookBtn.textContent = 'Забронювати';
        bookBtn.disabled = false;
    }
}

// ===== My Tickets =====
async function loadMyReservations() {
    const container = $('#my-reservations');

    if (!api.isLoggedIn()) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔐</div>
                <p>Увійдіть, щоб переглянути бронювання</p>
                <button class="btn btn-primary" id="login-from-tickets">Увійти</button>
            </div>
        `;
        $('#login-from-tickets').addEventListener('click', () => openAuthModal(false));
        return;
    }

    // If it's the first load (empty container), show spinner. Otherwise update "quietly"
    if (!container.innerHTML.trim()) {
        container.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Завантаження бронювань...</p>
            </div>
        `;
    }

    try {
        const reservations = await api.getReservations();
        const rawResList = Array.isArray(reservations) ? reservations : reservations.results || [];
        
        // Filter out reservations that have no tickets to avoid showing "empty fields"
        const resList = rawResList.filter(res => res.tickets && res.tickets.length > 0);

        if (resList.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎫</div>
                    <p>У вас ще немає бронювань</p>
                    <button class="btn btn-primary" onclick="showPage('home')">Переглянути афішу</button>
                </div>
            `;
            return;
        }

        container.innerHTML = resList.map(res => {
            const tickets = res.tickets || [];
            const ticketsHtml = tickets.map(t => {
                const perf = state.performances.find(p => p.id === t.performance);
                const play = perf ? state.plays[perf.play] : null;
                const hall = perf ? state.halls[perf.theatre_hall] : null;

                return `
                    <div class="ticket-item">
                        <div class="ticket-icon">🎫</div>
                        <div class="ticket-details">
                            <div class="ticket-header">
                                <strong>${play?.title || 'Вистава'} — ${hall?.name || 'Зал'}</strong>
                                <span class="btn-cancel-ticket" data-id="${t.id}">Скасувати</span>
                            </div>
                            <span>Ряд ${t.row}, Місце ${t.seat}${perf ? ' · ' + formatDate(perf.show_time) : ''}</span>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="reservation-card" id="res-card-${res.id}">
                    <div class="reservation-header">
                        <span class="reservation-id">Бронювання #${res.id}</span>
                        <div style="display:flex; gap:10px; align-items:center;">
                           <span class="reservation-date">${formatDate(res.created_at)}</span>
                           <span class="btn btn-outline btn-sm btn-cancel-res" style="color:#e74c3c; border-color:rgba(231,76,60,0.3);" data-id="${res.id}">Скасувати все</span>
                        </div>
                    </div>
                    ${ticketsHtml || '<p style="color: var(--text-muted); font-size: 0.85rem;">Квитків немає</p>'}
                </div>
            `;
        }).join('');

        // Use a flag to avoid multiple listeners
        if (!container.dataset.ready) {
            container.addEventListener('click', (e) => {
                const ticketBtn = e.target.closest('.btn-cancel-ticket');
                const resBtn = e.target.closest('.btn-cancel-res');
                if (ticketBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCancelTicket(e, parseInt(ticketBtn.dataset.id));
                } else if (resBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCancelReservation(e, parseInt(resBtn.dataset.id));
                }
            });
            container.dataset.ready = 'true';
        }

    } catch (err) {
        console.error('Load reservations error:', err);
        container.innerHTML = `<div class="empty-state"><p>Не вдалося завантажити бронювання</p></div>`;
    }
}

async function handleCancelTicket(e, id) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    openConfirmModal('Ви впевнені, що хочете скасувати цей квиток?', async () => {
        try {
            await api.deleteTicket(id);
            showToast('Квиток скасовано', 'success');
            await loadMyReservations();
            // Force staying on the tickets page
            showPage('my-tickets');
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

async function handleCancelReservation(e, id) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    openConfirmModal('Скасувати ціле бронювання?', async () => {
        try {
            await api.deleteReservation(id);
            showToast('Бронювання видалено', 'success');
            await loadMyReservations();
            // Force staying on the tickets page
            showPage('my-tickets');
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

// ===== Admin Panel Logic =====
const adminMeta = {
    performances: {
        endpoint: '/performances/',
        title: 'Вистави (Афіша)',
        fields: [
            { name: 'play', label: 'П\'єса (Пошук)', type: 'select', items: 'plays', labelKey: 'title' },
            { name: 'theatre_hall', label: 'Театральний Зал', type: 'select', items: 'halls', labelKey: 'name' },
            { name: 'show_time', label: 'Дата та час', type: 'datetime-local' }
        ],
        columns: ['ID', 'П\'єса', 'Зал', 'Час', 'Продано']
    },
    plays: {
        endpoint: '/plays/',
        title: 'Вихідні п\'єси',
        fields: [
            { name: 'title', label: 'Назва', type: 'text' },
            { name: 'description', label: 'Опис', type: 'textarea' },
            { name: 'image', label: 'Фото файлом', type: 'file' }
        ],
        columns: ['ID', 'Назва']
    },
    halls: {
        endpoint: '/theatre_halls/',
        title: 'Театральні Зали',
        fields: [
            { name: 'name', label: 'Назва', type: 'text' },
            { name: 'rows', label: 'Ряди', type: 'number' },
            { name: 'seats_in_row', label: 'Місць у ряду (напр. 10 або 10,12,12)', type: 'text' }
        ],
        columns: ['ID', 'Назва', 'Ряди', 'Місця']
    },
    actors: {
        endpoint: '/actors/',
        title: 'Актори',
        fields: [
            { name: 'first_name', label: 'Ім\'я', type: 'text' },
            { name: 'last_name', label: 'Прізвище', type: 'text' },
            { name: 'photo', label: 'Фото файлом', type: 'file' }
        ],
        columns: ['ID', 'Ім\'я', 'Прізвище']
    },
    genres: {
        endpoint: '/genres/',
        title: 'Жанри',
        fields: [{ name: 'name', label: 'Назва', type: 'text' }],
        columns: ['ID', 'Назва']
    }
};

async function loadAdminTab(tabName) {
    state.adminTab = tabName;
    const meta = adminMeta[tabName];
    $('#admin-table-head').innerHTML = meta.columns.map(c => `<th>${c}</th>`).join('') + '<th>Дії</th>';
    $('#admin-table-body').innerHTML = '<tr><td colspan="10" style="text-align:center;">Завантаження...</td></tr>';

    try {
        const data = await api.request(meta.endpoint);
        const list = Array.isArray(data) ? data : data.results || [];
        
        $('#admin-table-body').innerHTML = list.map(item => {
            const cells = meta.fields.map(f => {
                let val = item[f.name];
                if (tabName === 'performances') {
                    if (f.name === 'play') val = state.plays[val]?.title || val;
                    if (f.name === 'theatre_hall') val = state.halls[val]?.name || val;
                }
                if (tabName === 'halls' && f.name === 'seats_in_row') {
                    val = (item.seats_config || []).reduce((a, b) => a + b, 0);
                }
                if (f.type === 'datetime-local') val = new Date(val).toLocaleString();
                if (f.name === 'play' && tabName === 'performances') {
                    // special handling for play cell if it's already set to play object
                }
                return `<td>${val || '-'}</td>`;
            });
            const idCell = `<td>${item.id}</td>`;
            let extraCols = '';
            if (tabName === 'performances') {
                 extraCols = `<td>${item.tickets_count || 0}</td>`;
            }

            return `
                <tr>
                    ${idCell}
                    ${cells.slice(0, meta.columns.length - (extraCols ? 2 : 1)).join('')}
                    ${extraCols}
                    <td>
                        <div class="action-btns">
                            <button class="btn-icon" onclick="openAdminModal(${item.id})">✏️</button>
                            <button class="btn-icon delete" onclick="deleteAdminEntry(${item.id})">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        showToast('Помилка завантаження', 'error');
    }
}

async function openAdminModal(id = null) {
    state.adminEditingId = id;
    const meta = adminMeta[state.adminTab];
    $('#admin-modal-title').textContent = id ? `Редагування #${id}` : 'Додавання запису';
    
    let item = {};
    if (id) {
        try {
            item = await api.request(`${meta.endpoint}${id}/`);
        } catch {}
    }

    const fieldsHtml = meta.fields.map(f => {
        let inputHtml = '';
        if (f.type === 'textarea') {
            inputHtml = `<textarea id="admin-f-${f.name}" style="width:100%; min-height:100px; background:var(--bg-primary); border:1px solid var(--border); border-radius:4px; color:white; padding:10px;">${item[f.name] || ''}</textarea>`;
        } else if (f.type === 'select') {
            const list = Object.values(state[f.items] || {});
            const options = list.map(opt => `
                <option value="${opt.id}" ${item[f.name] == opt.id ? 'selected' : ''}>
                    ${opt[f.labelKey] || opt.id}
                </option>
            `).join('');
            inputHtml = `<select id="admin-f-${f.name}" style="width:100%; padding:14px; background:var(--bg-primary); color:white; border:1px solid var(--border); border-radius:8px;">
                <option value="">-- Оберіть ${f.label} --</option>
                ${options}
            </select>`;
        } else {
            inputHtml = `<input type="${f.type}" id="admin-f-${f.name}" value="${item[f.name] || ''}">`;
        }

        return `
            <div class="form-group">
                <label>${f.label}</label>
                ${inputHtml}
            </div>
        `;
    }).join('');

    $('#admin-form-fields').innerHTML = fieldsHtml;
    $('#admin-form-error').textContent = '';
    $('#admin-modal').classList.add('active');
}

async function handleAdminSave(e) {
    e.preventDefault();
    const meta = adminMeta[state.adminTab];
    const formData = new FormData();
    
    meta.fields.forEach(f => {
        const input = $(`#admin-f-${f.name}`);
        if (f.type === 'file') {
            if (input.files[0]) {
                formData.append(f.name, input.files[0]);
            }
        } else {
            formData.append(f.name, input.value);
        }
    });

    try {
        await api.adminSaveMultipart(meta.endpoint, state.adminEditingId, formData);
        showToast('Збережено успішно', 'success');
        $('#admin-modal').classList.remove('active');
        loadAdminTab(state.adminTab);
        loadAllData();
    } catch (err) {
        $('#admin-form-error').textContent = err.message;
    }
}

async function deleteAdminEntry(id) {
    openConfirmModal('Видалити цей запис назавжди?', async () => {
        try {
            await api.adminDelete(adminMeta[state.adminTab].endpoint, id);
            showToast('Видалено', 'success');
            loadAdminTab(state.adminTab);
            loadAllData();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    // --- Navbar scroll effect ---
    window.addEventListener('scroll', () => {
        const navbar = $('#navbar');
        if (window.scrollY > 30) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // --- Hamburger ---
    $('#nav-hamburger').addEventListener('click', () => {
        $('#nav-links').classList.toggle('open');
    });

    // --- Nav links ---
    $$('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            $('#nav-links').classList.remove('open');

            if (page === 'home') {
                showPage('home');
            } else if (page === 'my-tickets') {
                showPage('my-tickets');
                loadMyReservations();
            }
        });
    });

    // --- Logo ---
    $('#nav-logo').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('home');
    });

    // --- Back link ---
    $('#back-link').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('home');
    });

    // --- Auth modal ---
    $('#modal-close').addEventListener('click', closeAuthModal);
    $('#auth-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeAuthModal();
    });

    // --- Auth form ---
    $('#auth-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const modal = $('#auth-modal');
        const username = $('#auth-username').value.trim();
        const email = $('#auth-email').value.trim();
        const password = $('#auth-password').value;
        const passwordRepeat = $('#auth-password-repeat').value;
        const errorEl = $('#form-error');

        errorEl.textContent = '';

        const isProfileMode = modal.dataset.mode === 'profile';
        if ((isRegisterMode || (isProfileMode && password)) && password !== passwordRepeat) {
            errorEl.textContent = 'Паролі не збігаються';
            return;
        }

        try {
            if (modal.dataset.mode === 'profile') {
                // Profile update
                const updateData = { username, email };
                if (password) updateData.password = password;
                const credentials = localStorage.getItem('theater_credentials');
                const url = `${API_BASE}/me/`;
                const response = await fetch(url, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${credentials}`,
                    },
                    body: JSON.stringify(updateData),
                });
                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(Object.values(err).flat().join(', ') || 'Помилка');
                }
                const updatedUser = await response.json();
                api.setUser(updatedUser);
                // If password changed, update credentials
                if (password) {
                    const newCreds = btoa(`${username}:${password}`);
                    localStorage.setItem('theater_credentials', newCreds);
                }
                closeAuthModal();
                updateAuthUI();
                showToast('Профіль оновлено! ✓', 'success');
            } else if (isRegisterMode) {
                await api.register(username, email, password);
                showToast('Реєстрація успішна! Тепер увійдіть.', 'success');
                openAuthModal(false);
            } else {
                await api.login(username, password);
                closeAuthModal();
                updateAuthUI();
                showToast(`Вітаємо, ${username}! 🎉`, 'success');
            }
        } catch (err) {
            errorEl.textContent = err.message || 'Помилка';
        }
    });

    // --- Book button ---
    $('#book-btn').addEventListener('click', handleBooking);

    // --- Admin Events ---
    $('#admin-add-btn')?.addEventListener('click', () => openAdminModal());
    $('#admin-modal-close')?.addEventListener('click', () => $('#admin-modal').classList.remove('active'));
    $('#admin-form')?.addEventListener('submit', handleAdminSave);
    
    $$('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            $$('.admin-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadAdminTab(tab.dataset.tab);
        });
    });

    // --- Confirm Events ---
    $('#confirm-cancel')?.addEventListener('click', closeConfirmModal);
    $('#confirm-ok')?.addEventListener('click', async () => {
        if (confirmCallback) await confirmCallback();
        closeConfirmModal();
    });

    // --- Init ---
    updateAuthUI();
    loadAllData();

    // Initial routing
    const initialPage = location.hash.replace('#', '') || 'home';
    showPage(initialPage, false);
});

// Exposed globally for static onclick
window.handleCancelTicket = handleCancelTicket;
window.handleCancelReservation = handleCancelReservation;
window.openAdminModal = openAdminModal;
window.deleteAdminEntry = deleteAdminEntry;
