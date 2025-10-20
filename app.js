// ===== Configuration de l'API Jikan =====
const JIKAN_API_BASE = 'https://api.jikan.moe/v4';
const ITEMS_PER_PAGE = 20;

// État de l'application
let currentPage = 1;
let totalPages = 1;
let currentSearch = '';
let isLoading = false;

// Éléments DOM
const animeGrid = document.getElementById('animeGrid');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageNumbers = document.getElementById('pageNumbers');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const animeDetailModal = document.getElementById('animeDetailModal');
const addToFavoritesModal = document.getElementById('addToFavoritesModal');

// Variable pour stocker l'anime en cours
let currentAnimeForFavorite = null;

// ===== Fonctions API =====

// Récupérer les animes (top animes ou recherche)
async function fetchAnimes(page = 1, searchQuery = '') {
    if (isLoading) return;
    
    isLoading = true;
    showLoading();
    hideError();

    try {
        let url;
        if (searchQuery) {
            url = `${JIKAN_API_BASE}/anime?q=${encodeURIComponent(searchQuery)}&page=${page}&limit=${ITEMS_PER_PAGE}&order_by=popularity`;
        } else {
            url = `${JIKAN_API_BASE}/top/anime?page=${page}&limit=${ITEMS_PER_PAGE}`;
        }

        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Erreur lors de la récupération des données');
        }

        const data = await response.json();
        
        // Mise à jour de l'état
        currentPage = page;
        totalPages = data.pagination.last_visible_page || 1;
        
        // Afficher les animes
        displayAnimes(data.data);
        updatePagination();
        
        // Scroll vers le haut
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
    } catch (error) {
        console.error('Erreur:', error);
        showError();
    } finally {
        isLoading = false;
        hideLoading();
    }
}

// Récupérer les détails d'un anime
async function fetchAnimeDetails(animeId) {
    try {
        showLoading();
        const response = await fetch(`${JIKAN_API_BASE}/anime/${animeId}/full`);
        
        if (!response.ok) {
            throw new Error('Erreur lors de la récupération des détails');
        }

        const data = await response.json();
        await displayAnimeDetails(data.data);
        openModal(animeDetailModal);
        
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Impossible de charger les détails de l\'anime', 'error');
    } finally {
        hideLoading();
    }
}

// ===== Fonctions d'affichage =====

// Créer une carte d'anime
function createAnimeCard(anime) {
    const score = anime.score || 'N/A';
    const imageUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '';
    const title = anime.title || anime.title_english || 'Sans titre';
    const type = anime.type || 'TV';
    const episodes = anime.episodes ? `${anime.episodes} ep` : 'En cours';

    return `
        <div class="anime-card" data-anime-id="${anime.mal_id}">
            <img src="${imageUrl}" 
                 alt="${title}" 
                 class="anime-card-image"
                 onerror="this.src='https://via.placeholder.com/250x350?text=No+Image'">
            <div class="anime-card-content">
                <h3 class="anime-card-title">${title}</h3>
                <div class="anime-card-info">
                    <span>${type} • ${episodes}</span>
                    <span class="anime-card-score">
                        ⭐ ${score}
                    </span>
                </div>
            </div>
        </div>
    `;
}

// Afficher les animes dans la grille
async function displayAnimes(animes) {
    // Filtrer les animes déjà en favoris si l'utilisateur est connecté
    let filteredAnimes = animes;
    if (authManager.isLoggedIn()) {
        // Récupérer la liste des favoris
        const favorites = await authManager.getFavorites();
        const favoriteIds = favorites.map(fav => fav.mal_id);
        filteredAnimes = animes.filter(anime => !favoriteIds.includes(anime.mal_id));
    }
    
    if (filteredAnimes.length === 0) {
        animeGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <p>✨ Tous ces animes sont déjà dans vos favoris !</p>
                <p>Passez à la page suivante ou utilisez la recherche pour découvrir de nouveaux animes.</p>
            </div>
        `;
        return;
    }

    animeGrid.innerHTML = filteredAnimes.map(anime => createAnimeCard(anime)).join('');
    
    // Ajouter les événements de clic pour les détails
    document.querySelectorAll('.anime-card').forEach(card => {
        card.addEventListener('click', () => {
            const animeId = card.dataset.animeId;
            fetchAnimeDetails(animeId);
        });
    });
}

// Afficher les détails d'un anime
async function displayAnimeDetails(anime) {
    const isFav = await authManager.isFavorite(anime.mal_id);
    const imageUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '';
    const title = anime.title || 'Sans titre';
    const titleEnglish = anime.title_english || '';
    const titleJapanese = anime.title_japanese || '';
    const score = anime.score || 'N/A';
    const rank = anime.rank || 'N/A';
    const popularity = anime.popularity || 'N/A';
    const episodes = anime.episodes || 'N/A';
    const status = anime.status || 'N/A';
    const aired = anime.aired?.string || 'N/A';
    const duration = anime.duration || 'N/A';
    const synopsis = anime.synopsis || 'Pas de synopsis disponible.';
    const genres = anime.genres || [];
    const studios = anime.studios || [];
    const source = anime.source || 'N/A';
    const rating = anime.rating || 'N/A';

    // Stocker l'anime actuel
    currentAnimeForFavorite = anime;

    const detailHTML = `
        <div class="anime-detail-container">
            <div>
                <img src="${imageUrl}" alt="${title}" class="anime-detail-image">
                <button class="favorite-btn ${isFav ? 'active' : ''}" 
                        style="position: static; margin-top: 1rem; width: 100%; border-radius: 25px; height: auto; padding: 1rem;"
                        onclick="toggleFavoriteFromDetail(${anime.mal_id})">
                    ${isFav ? '❤️ Retirer des favoris' : '🤍 Ajouter aux favoris'}
                </button>
            </div>
            <div class="anime-detail-info">
                <h2>${title}</h2>
                ${titleEnglish ? `<p style="color: var(--text-secondary); margin-bottom: 0.5rem;">${titleEnglish}</p>` : ''}
                ${titleJapanese ? `<p style="color: var(--text-secondary); margin-bottom: 1rem;">${titleJapanese}</p>` : ''}
                
                <div class="anime-detail-meta">
                    <span class="meta-badge">⭐ Score: ${score}</span>
                    <span class="meta-badge">🏆 Rang: #${rank}</span>
                    <span class="meta-badge">👥 Popularité: #${popularity}</span>
                </div>

                <div style="margin-top: 1.5rem;">
                    <p><strong>Type:</strong> ${anime.type || 'N/A'}</p>
                    <p><strong>Épisodes:</strong> ${episodes}</p>
                    <p><strong>Statut:</strong> ${status}</p>
                    <p><strong>Diffusion:</strong> ${aired}</p>
                    <p><strong>Durée:</strong> ${duration}</p>
                    <p><strong>Source:</strong> ${source}</p>
                    <p><strong>Classification:</strong> ${rating}</p>
                    ${studios.length > 0 ? `<p><strong>Studios:</strong> ${studios.map(s => s.name).join(', ')}</p>` : ''}
                </div>

                ${genres.length > 0 ? `
                    <div class="genre-tags">
                        ${genres.map(genre => `<span class="genre-tag">${genre.name}</span>`).join('')}
                    </div>
                ` : ''}

                <div class="anime-detail-synopsis">
                    <h3 style="margin-bottom: 1rem; color: var(--text-primary);">Synopsis</h3>
                    <p>${synopsis}</p>
                </div>

                ${anime.trailer?.embed_url ? `
                    <div style="margin-top: 2rem;">
                        <h3 style="margin-bottom: 1rem; color: var(--text-primary);">Bande-annonce</h3>
                        <iframe 
                            width="100%" 
                            height="315" 
                            src="${anime.trailer.embed_url}" 
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen
                            style="border-radius: 15px;">
                        </iframe>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    document.getElementById('animeDetail').innerHTML = detailHTML;
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
            pagesHTML += `<span style="padding: 0.8rem; color: var(--text-secondary);">...</span>`;
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
            pagesHTML += `<span style="padding: 0.8rem; color: var(--text-secondary);">...</span>`;
        }
        pagesHTML += `<button class="page-number" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }

    pageNumbers.innerHTML = pagesHTML;
}

function goToPage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    fetchAnimes(page, currentSearch);
}

// ===== Gestion des favoris =====

async function toggleFavoriteFromDetail(animeId) {
    if (!authManager.isLoggedIn()) {
        openModal(document.getElementById('authModal'));
        showNotification('Connectez-vous pour ajouter des favoris', 'info');
        return;
    }

    const isFav = await authManager.isFavorite(animeId);
    
    if (isFav) {
        // Retirer des favoris
        if (confirm('Voulez-vous retirer cet anime de vos favoris ?')) {
            await authManager.removeFavorite(animeId);
            showNotification('Retiré des favoris', 'info');
            await updateFavoritesCount();
            updateFavoriteButtons();
            closeModal(animeDetailModal);
        }
    } else {
        // Ouvrir la modale de notation
        openAddToFavoritesModal(currentAnimeForFavorite);
    }
}

// Ouvrir la modale d'ajout aux favoris
let starRatingAddInstance = null;

function openAddToFavoritesModal(anime) {
    if (!anime) return;
    
    const modalContent = document.getElementById('addToFavoritesContent');
    modalContent.innerHTML = `
        <div class="edit-favorite-form">
            <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; align-items: center;">
                <img src="${anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || ''}" 
                     alt="${anime.title}" 
                     style="width: 80px; height: 120px; object-fit: cover; border-radius: 10px;">
                <div>
                    <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">${anime.title}</h3>
                    <p style="color: var(--text-secondary); font-size: 0.9rem;">
                        ${anime.type || 'TV'} • ${anime.episodes || '?'} épisodes
                    </p>
                </div>
            </div>
            
            <div class="star-rating-input">
                <label>Votre note: <span style="color: var(--primary-pink);">*</span></label>
                <div class="stars-input" id="starsInput"></div>
                <div style="color: var(--text-secondary); margin-top: 0.5rem; font-size: 0.95rem;">
                    Note sélectionnée: <span id="selectedRatingAdd" style="font-weight: 700; color: var(--primary-pink);">0</span>/5
                </div>
            </div>
            
            <div class="comment-input">
                <label>Votre commentaire: <span style="color: var(--text-secondary); font-weight: 400;">(optionnel)</span></label>
                <textarea id="commentTextareaAdd" placeholder="Partagez votre avis sur cet anime..."></textarea>
            </div>
            
            <button class="btn-primary" onclick="confirmAddToFavorites()">
                ❤️ Ajouter à mes favoris
            </button>
        </div>
    `;
    
    closeModal(animeDetailModal);
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
        showNotification('Ajouté aux favoris avec succès ! ❤️', 'success');
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
    
    if (query) {
        fetchAnimes(1, query);
    } else {
        fetchAnimes(1);
    }
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

// Recherche
searchBtn.addEventListener('click', performSearch);

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        performSearch();
    }
});

// Effacer la recherche si le champ est vidé
searchInput.addEventListener('input', (e) => {
    if (e.target.value === '' && currentSearch !== '') {
        currentSearch = '';
        fetchAnimes(1);
    }
});

// ===== Initialisation =====

// Charger les animes au démarrage
document.addEventListener('DOMContentLoaded', () => {
    fetchAnimes(1);
});

// Note: Respect de l'API Jikan - limite de 3 requêtes par seconde
// En cas d'erreur 429 (Too Many Requests), implémenter un système de retry avec délai

