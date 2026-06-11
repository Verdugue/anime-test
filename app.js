// ===== Configuration de l'API Jikan =====
const JIKAN_API_BASE = 'https://api.jikan.moe/v4';
const ITEMS_PER_PAGE = 20;

// État de l'application
let currentPage = 1;
let totalPages = 1;
let currentSearch = '';
let isLoading = false;
let currentType = '';
let currentGenres = [];
let currentSort = '';

// Éléments DOM
const animeGrid = document.getElementById('animeGrid');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageNumbers = document.getElementById('pageNumbers');
const searchInput = document.getElementById('searchInput');
const addToFavoritesModal = document.getElementById('addToFavoritesModal');
const resultsCount = document.getElementById('resultsCount');
const sortSelect = document.getElementById('sortSelect');

// Animes de la page courante (pour le bouton favori des cartes)
const animeById = new Map();

// Variable pour stocker l'anime en cours
let currentAnimeForFavorite = null;

// Anime mis en avant dans le hero
let featuredAnime = null;

// ===== Fonctions API =====

// Récupérer les animes (top animes ou recherche)
async function fetchAnimes(page = 1, searchQuery = '', type = '', genres = []) {
    if (isLoading) return;

    isLoading = true;
    showLoading();
    hideError();

    try {
        let url;
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', ITEMS_PER_PAGE);

        if (searchQuery) {
            params.append('q', searchQuery);
        }

        if (type) {
            params.append('type', type);
        }

        if (genres.length > 0) {
            params.append('genres', genres.join(','));
        }

        const hasFilters = searchQuery || type || genres.length > 0 || currentSort;

        if (hasFilters) {
            if (currentSort) {
                params.append('order_by', currentSort);
                params.append('sort', currentSort === 'start_date' ? 'desc' : (currentSort === 'popularity' ? 'asc' : 'desc'));
            } else if (searchQuery) {
                params.append('order_by', 'popularity');
            }
            url = `${JIKAN_API_BASE}/anime?${params.toString()}`;
        } else {
            url = `${JIKAN_API_BASE}/top/anime?${params.toString()}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Erreur lors de la récupération des données');
        }

        const data = await response.json();

        // Mise à jour de l'état
        currentPage = page;
        totalPages = data.pagination.last_visible_page || 1;

        // Compteurs éditoriaux
        updateResultsCount(data.pagination);

        // Carte "À la une" : premier anime du top (page 1, sans filtre)
        if (!hasFilters && page === 1 && data.data.length > 0) {
            setHeroFeature(data.data[0]);
        }

        // Afficher les animes
        displayAnimes(data.data);
        updatePagination();

        // Scroll vers le haut de la grille (sauf au premier chargement)
        if (page !== 1 || hasFilters) {
            document.querySelector('.filters')?.scrollIntoView({ behavior: 'smooth' });
        }

    } catch (error) {
        console.error('Erreur:', error);
        showError();
    } finally {
        isLoading = false;
        hideLoading();
    }
}

// Ouvrir la page dédiée d'un anime
function openAnimePage(animeId) {
    window.location.href = `anime.html?id=${animeId}`;
}

// ===== Fonctions d'affichage =====

// Compteur de résultats + compteur hero
function updateResultsCount(pagination) {
    const total = pagination?.items?.total;
    if (resultsCount) {
        resultsCount.textContent = total != null
            ? `${total.toLocaleString('fr-FR')} résultat${total > 1 ? 's' : ''}`
            : '— résultats';
    }
    const counterAnimes = document.getElementById('counterAnimes');
    if (counterAnimes && total != null && total > 0) {
        counterAnimes.textContent = total.toLocaleString('fr-FR');
    }
}

// Carte "À la une" dans le hero
function setHeroFeature(anime) {
    featuredAnime = anime;
    const title = anime.title || anime.title_english || 'Sans titre';
    const studio = anime.studios?.[0]?.name || anime.type || '—';
    const eps = anime.episodes ? `${anime.episodes} ép.` : 'En cours';
    const score = anime.score != null ? anime.score.toFixed(1) : '—';

    const titleEl = document.getElementById('heroFeatureTitle');
    const subEl = document.getElementById('heroFeatureSub');
    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = `${score} · ${studio} · ${eps}`;

    const bg = document.getElementById('heroFeatureBg');
    const imageUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '';
    if (bg && imageUrl && !bg.querySelector('img')) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = '';
        bg.insertBefore(img, bg.querySelector('.hero-feature-grain'));
    }
}

// Créer une carte d'anime (style éditorial)
function createAnimeCard(anime, idx) {
    const score = anime.score != null ? anime.score.toFixed(1) : 'N/A';
    const imageUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '';
    const title = anime.title || anime.title_english || 'Sans titre';
    const titleJp = anime.title_japanese || '';
    const type = anime.type || 'TV';
    const episodes = anime.episodes ? `${anime.episodes} ép.` : 'En cours';
    const year = anime.year || anime.aired?.prop?.from?.year || '—';
    const genres = (anime.genres || []).slice(0, 2);
    const num = String((currentPage - 1) * ITEMS_PER_PAGE + idx + 1).padStart(3, '0');

    return `
        <article class="card" data-anime-id="${anime.mal_id}">
            <div class="card-media">
                <img src="${imageUrl}" alt="${title}" loading="lazy"
                     onerror="this.style.display='none'">
                <div class="card-num t-mono">№ ${num}</div>
                <button class="card-fav" data-fav-id="${anime.mal_id}" aria-label="Ajouter aux favoris">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.35-9.5-9C1 8.5 3 5 6.5 5c2 0 3.5 1 5.5 3 2-2 3.5-3 5.5-3C21 5 23 8.5 21.5 12 19 16.65 12 21 12 21z"/></svg>
                </button>
                <div class="card-overlay">
                    <span class="tag accent">${type}</span>
                    <span class="card-eps t-mono">${episodes}</span>
                </div>
            </div>
            <div class="card-body">
                <div class="card-meta-row">
                    <span class="t-mono card-year">${year}</span>
                    <span class="card-score">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7 7.5.5-5.7 5 1.7 7.5L12 18l-6.5 4 1.7-7.5L1.5 9.5 9 9z"/></svg>
                        <span>${score}</span>
                    </span>
                </div>
                <h3 class="card-title">${title}</h3>
                ${titleJp ? `<div class="card-jp t-jp">${titleJp}</div>` : ''}
                ${genres.length > 0 ? `
                    <div class="card-genres">
                        ${genres.map(g => `<span class="card-genre">${g.name}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        </article>
    `;
}

// Afficher les animes dans la grille
async function displayAnimes(animes) {
    // Filtrer les animes déjà en favoris si l'utilisateur est connecté
    let filteredAnimes = animes;
    if (authManager.isLoggedIn()) {
        const favorites = await authManager.getFavorites();
        const favoriteIds = favorites.map(fav => fav.mal_id);
        filteredAnimes = animes.filter(anime => !favoriteIds.includes(anime.mal_id));
    }

    animeById.clear();
    filteredAnimes.forEach(a => animeById.set(a.mal_id, a));

    if (filteredAnimes.length === 0) {
        animeGrid.innerHTML = `
            <div class="empty" style="grid-column: 1/-1; background: var(--bg);">
                <div class="t-display empty-num">00</div>
                <p>Tous ces animes sont déjà dans vos favoris.</p>
                <p class="empty-hint t-mono">Passez à la page suivante ou cherchez un titre</p>
            </div>
        `;
        return;
    }

    animeGrid.innerHTML = filteredAnimes.map((anime, idx) => createAnimeCard(anime, idx)).join('');

    // Clic sur une carte → page dédiée
    document.querySelectorAll('.card[data-anime-id]').forEach(card => {
        card.addEventListener('click', () => {
            openAnimePage(card.dataset.animeId);
        });
    });

    // Clic sur le cœur → ajout aux favoris
    document.querySelectorAll('.card-fav').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleCardFav(Number(btn.dataset.favId));
        });
    });
}

// Cœur d'une carte : ouvre la modale de notation (ou la connexion)
function handleCardFav(animeId) {
    if (!authManager.isLoggedIn()) {
        openModal(document.getElementById('authModal'));
        showNotification('Connectez-vous pour ajouter des favoris', 'info');
        return;
    }
    const anime = animeById.get(animeId);
    if (!anime) return;
    currentAnimeForFavorite = anime;
    openAddToFavoritesModal(anime);
}

// ===== Gestion de la pagination =====

function updatePagination() {
    // Boutons précédent/suivant
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;

    // Numéros de page
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    // Ajuster si on est près de la fin
    if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    let pagesHTML = '';

    // Première page
    if (startPage > 1) {
        pagesHTML += `<button class="page-number" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) {
            pagesHTML += `<span class="page-ellipsis">…</span>`;
        }
    }

    // Pages visibles
    for (let i = startPage; i <= endPage; i++) {
        pagesHTML += `
            <button class="page-number ${i === currentPage ? 'active' : ''}"
                    onclick="goToPage(${i})">
                ${i}
            </button>
        `;
    }

    // Dernière page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pagesHTML += `<span class="page-ellipsis">…</span>`;
        }
        pagesHTML += `<button class="page-number" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }

    pageNumbers.innerHTML = pagesHTML;
}

function goToPage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    fetchAnimes(page, currentSearch, currentType, currentGenres);
}

// ===== Gestion des favoris =====

// Ouvrir la modale d'ajout aux favoris
let starRatingAddInstance = null;

function openAddToFavoritesModal(anime) {
    if (!anime) return;

    const modalContent = document.getElementById('addToFavoritesContent');
    modalContent.innerHTML = `
        <div class="rate-form">
            <div class="rate-form-anime">
                <img src="${anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || ''}"
                     alt="${anime.title}">
                <div>
                    <div class="rate-form-anime-title">${anime.title}</div>
                    <div class="rate-form-anime-sub">${anime.type || 'TV'} · ${anime.episodes || '?'} épisodes</div>
                </div>
            </div>

            <div>
                <div class="t-eyebrow">Ta note *</div>
                <div class="stars-input" id="starsInput" style="margin-top: 10px;"></div>
                <div class="rate-value t-mono">Note sélectionnée : <strong id="selectedRatingAdd">0</strong>/5</div>
            </div>

            <div>
                <div class="t-eyebrow" style="margin-bottom: 8px;">Ton avis (optionnel)</div>
                <textarea id="commentTextareaAdd" class="input-area" placeholder="Partagez votre avis sur cet anime…"></textarea>
            </div>

            <button class="btn btn-primary" onclick="confirmAddToFavorites()">
                ♥ Ajouter à mes favoris
            </button>
        </div>
    `;

    openModal(addToFavoritesModal);

    // Réinitialiser la note
    selectedRatingForAddValue = 0;

    // Initialiser le système d'étoiles
    starRatingAddInstance = createStarRating('starsInput', 0, (rating) => {
        document.getElementById('selectedRatingAdd').textContent = rating;
        selectedRatingForAddValue = rating;
    });
}

// Sélectionner une note pour l'ajout
let selectedRatingForAddValue = 0;

// Confirmer l'ajout aux favoris
async function confirmAddToFavorites() {
    if (selectedRatingForAddValue === 0) {
        showNotification('Veuillez sélectionner une note', 'error');
        return;
    }

    const comment = document.getElementById('commentTextareaAdd').value.trim();

    if (!currentAnimeForFavorite) {
        showNotification('Erreur: anime non trouvé', 'error');
        return;
    }

    try {
        await authManager.addFavorite(currentAnimeForFavorite, selectedRatingForAddValue, comment);
        closeModal(addToFavoritesModal);
        showNotification('Ajouté aux favoris ♥', 'success');
        await updateFavoritesCount();
        updateFavoriteButtons();

        // Réinitialiser
        selectedRatingForAddValue = 0;
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function updateFavoriteButtons() {
    // Rafraîchir l'affichage de la grille actuelle
    // Cette fonction est appelée après un changement de favoris
}

// ===== Gestion de la recherche =====

function performSearch() {
    const query = searchInput.value.trim();
    currentSearch = query;
    currentPage = 1;
    fetchAnimes(currentPage, currentSearch, currentType, currentGenres);
    updateResetVisibility();
}

// ===== Utilitaires =====

function showLoading() {
    loading.style.display = 'block';
    animeGrid.style.display = 'none';
}

function hideLoading() {
    loading.style.display = 'none';
    animeGrid.style.display = 'grid';
}

function showError() {
    errorMessage.style.display = 'block';
    animeGrid.style.display = 'none';
}

function hideError() {
    errorMessage.style.display = 'none';
}

// ===== Événements =====

// Boutons de pagination
prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        goToPage(currentPage - 1);
    }
});

nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
        goToPage(currentPage + 1);
    }
});

// Recherche (appuyer sur Enter pour chercher)
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        performSearch();
    }
});

// Tri
sortSelect.addEventListener('change', () => {
    currentSort = sortSelect.value;
    currentPage = 1;
    fetchAnimes(currentPage, currentSearch, currentType, currentGenres);
    updateResetVisibility();
});

// ===== Gestion des filtres (chips) =====

// Bouton de réinitialisation (apparaît dans la rangée Genres)
let resetChip = null;

function updateResetVisibility() {
    if (!resetChip) return;
    const hasFilters = currentSearch || currentType || currentGenres.length > 0 || currentSort;
    resetChip.style.display = hasFilters ? 'inline-flex' : 'none';
}

// Chips de type
function setupTypeChips() {
    const chips = document.querySelectorAll('#typeChips .chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentType = chip.dataset.type || '';
            currentPage = 1;
            fetchAnimes(currentPage, currentSearch, currentType, currentGenres);
            updateResetVisibility();
        });
    });
}

// Charger les genres depuis l'API → chips
async function loadGenres() {
    const genreChipsContainer = document.getElementById('genreChips');
    try {
        const response = await fetch(`${JIKAN_API_BASE}/genres/anime?filter=genres`);
        const data = await response.json();

        genreChipsContainer.innerHTML = '';

        data.data.forEach(genre => {
            const chip = document.createElement('button');
            chip.className = 'chip';
            chip.textContent = genre.name;
            chip.dataset.genreId = genre.mal_id;
            chip.addEventListener('click', () => {
                chip.classList.toggle('active');
                const genreId = String(genre.mal_id);
                const index = currentGenres.indexOf(genreId);
                if (index > -1) {
                    currentGenres.splice(index, 1);
                } else {
                    currentGenres.push(genreId);
                }
                currentPage = 1;
                fetchAnimes(currentPage, currentSearch, currentType, currentGenres);
                updateResetVisibility();
            });
            genreChipsContainer.appendChild(chip);
        });

        // Chip de réinitialisation
        resetChip = document.createElement('button');
        resetChip.className = 'chip chip-reset';
        resetChip.id = 'resetFiltersBtn';
        resetChip.innerHTML = '✕ Réinitialiser';
        resetChip.style.display = 'none';
        resetChip.addEventListener('click', resetFilters);
        genreChipsContainer.appendChild(resetChip);

    } catch (error) {
        console.error('Erreur lors du chargement des genres:', error);
        genreChipsContainer.innerHTML = '<span class="t-eyebrow">Erreur de chargement des genres</span>';
    }
}

// Réinitialiser les filtres
function resetFilters() {
    currentType = '';
    currentGenres = [];
    currentSearch = '';
    currentSort = '';
    currentPage = 1;

    // Réinitialiser les chips de type
    document.querySelectorAll('#typeChips .chip').forEach((chip, index) => {
        chip.classList.toggle('active', index === 0);
    });

    // Réinitialiser les chips de genre
    document.querySelectorAll('#genreChips .chip:not(.chip-reset)').forEach(chip => {
        chip.classList.remove('active');
    });

    // Réinitialiser recherche + tri
    searchInput.value = '';
    sortSelect.value = '';

    updateResetVisibility();

    // Recharger les animes
    fetchAnimes(currentPage, currentSearch, currentType, currentGenres);
}

// Effacer la recherche si le champ est vidé
searchInput.addEventListener('input', (e) => {
    if (e.target.value === '' && currentSearch !== '') {
        currentSearch = '';
        fetchAnimes(1, currentSearch, currentType, currentGenres);
        updateResetVisibility();
    }
});

// Carte "À la une" → page dédiée
document.getElementById('heroFeatureCard')?.addEventListener('click', () => {
    if (featuredAnime) {
        openAnimePage(featuredAnime.mal_id);
    }
});

// ===== Initialisation =====

// Charger les animes et les filtres au démarrage
document.addEventListener('DOMContentLoaded', () => {
    fetchAnimes(1);
    loadGenres();
    setupTypeChips();
});

// Note: Respect de l'API Jikan - limite de 3 requêtes par seconde
// En cas d'erreur 429 (Too Many Requests), implémenter un système de retry avec délai
