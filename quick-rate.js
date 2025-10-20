// Script pour la notation rapide style Tinder

// Configuration
const ANIMES_PER_SESSION = 20;
const JIKAN_API_BASE = 'https://api.jikan.moe/v4';

// État de l'application
let currentAnimeIndex = 0;
let animesQueue = [];
let skipCount = 0;
let rateCount = 0;
let isProcessing = false;

// Éléments DOM
const quickRateContainer = document.getElementById('quickRateContainer');
const loginRequired = document.getElementById('loginRequired');
const loadingQuick = document.getElementById('loadingQuick');
const endMessage = document.getElementById('endMessage');
const animeSwipeCard = document.getElementById('animeSwipeCard');
const skipBtn = document.getElementById('skipBtn');
const likeBtn = document.getElementById('likeBtn');
const ratingModal = document.getElementById('ratingModal');

// Compteurs
const skipCountElement = document.getElementById('skipCount');
const rateCountElement = document.getElementById('rateCount');
const totalCountElement = document.getElementById('totalCount');

// Initialisation
async function initQuickRate() {
    updateAuthButton();
    
    if (!authManager.isLoggedIn()) {
        showLoginRequired();
        return;
    }
    
    await loadAnimes();
}

// Afficher le message de connexion requise
function showLoginRequired() {
    loginRequired.style.display = 'block';
    quickRateContainer.style.display = 'none';
    endMessage.style.display = 'none';
}

// Charger les animes
async function loadAnimes() {
    loadingQuick.style.display = 'block';
    quickRateContainer.style.display = 'none';
    
    try {
        // Charger des animes populaires aléatoirement
        const randomPage = Math.floor(Math.random() * 10) + 1;
        const response = await fetch(`${JIKAN_API_BASE}/top/anime?page=${randomPage}&limit=25`);
        
        if (!response.ok) {
            throw new Error('Erreur lors du chargement');
        }
        
        const data = await response.json();
        animesQueue = data.data.slice(0, ANIMES_PER_SESSION);
        
        // Filtrer les animes déjà en favoris
        animesQueue = animesQueue.filter(anime => !authManager.isFavorite(anime.mal_id));
        
        if (animesQueue.length === 0) {
            showEndMessage();
            return;
        }
        
        currentAnimeIndex = 0;
        skipCount = 0;
        rateCount = 0;
        updateCounters();
        
        loadingQuick.style.display = 'none';
        quickRateContainer.style.display = 'block';
        
        displayCurrentAnime();
        
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors du chargement des animes', 'error');
        loadingQuick.style.display = 'none';
    }
}

// Afficher l'anime actuel
function displayCurrentAnime() {
    if (currentAnimeIndex >= animesQueue.length) {
        showEndMessage();
        return;
    }
    
    const anime = animesQueue[currentAnimeIndex];
    const imageUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '';
    const title = anime.title || anime.title_english || 'Sans titre';
    const score = anime.score || 'N/A';
    const rank = anime.rank || 'N/A';
    const type = anime.type || 'TV';
    const episodes = anime.episodes ? `${anime.episodes} ep` : 'En cours';
    const year = anime.year || anime.aired?.prop?.from?.year || 'N/A';
    const synopsis = anime.synopsis || 'Pas de synopsis disponible.';
    const genres = anime.genres || [];
    
    animeSwipeCard.className = 'anime-swipe-card fade-in';
    animeSwipeCard.innerHTML = `
        <span class="swipe-indicator like">❤️</span>
        <span class="swipe-indicator skip">👎</span>
        <img src="${imageUrl}" 
             alt="${title}" 
             class="swipe-card-image"
             onerror="this.src='https://via.placeholder.com/500x450?text=No+Image'">
        <div class="swipe-card-content">
            <h2 class="swipe-card-title">${title}</h2>
            
            <div class="swipe-card-meta">
                <span class="swipe-meta-tag">⭐ ${score}</span>
                <span class="swipe-meta-tag">🏆 Rang #${rank}</span>
                <span class="swipe-meta-tag">📺 ${type}</span>
                <span class="swipe-meta-tag">🎬 ${episodes}</span>
                <span class="swipe-meta-tag">📅 ${year}</span>
            </div>
            
            <p class="swipe-card-synopsis">${synopsis}</p>
            
            ${genres.length > 0 ? `
                <div class="swipe-card-genres">
                    ${genres.slice(0, 5).map(genre => 
                        `<span class="swipe-genre-tag">${genre.name}</span>`
                    ).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

// Passer à l'anime suivant avec animation
function nextAnime(direction) {
    if (isProcessing) return;
    isProcessing = true;
    
    // Animation de sortie
    animeSwipeCard.classList.add(direction === 'left' ? 'swipe-left' : 'swipe-right');
    
    setTimeout(() => {
        currentAnimeIndex++;
        updateCounters();
        displayCurrentAnime();
        isProcessing = false;
    }, 500);
}

// Ignorer l'anime
function skipAnime() {
    if (isProcessing) return;
    
    skipCount++;
    createParticle('👎', skipBtn);
    nextAnime('left');
}

// Aimer l'anime
function likeAnime() {
    if (isProcessing) return;
    
    const anime = animesQueue[currentAnimeIndex];
    createParticle('❤️', likeBtn);
    
    // Ouvrir la modale de notation
    openRatingModal(anime);
}

// Ouvrir la modale de notation
let starRatingQuickInstance = null;

function openRatingModal(anime) {
    const ratingContent = document.getElementById('ratingContent');
    
    ratingContent.innerHTML = `
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
                <div class="stars-input" id="starsInputQuick"></div>
                <div style="color: var(--text-secondary); margin-top: 0.5rem; font-size: 0.95rem;">
                    Note sélectionnée: <span id="selectedRatingQuick" style="font-weight: 700; color: var(--primary-pink);">0</span>/5
                </div>
            </div>
            
            <div class="comment-input">
                <label>Votre commentaire: <span style="color: var(--text-secondary); font-weight: 400;">(optionnel)</span></label>
                <textarea id="commentTextareaQuick" placeholder="Partagez votre avis sur cet anime..."></textarea>
            </div>
            
            <div style="display: flex; gap: 1rem;">
                <button class="btn-primary" onclick="confirmRating()" style="flex: 1;">
                    ❤️ Valider
                </button>
                <button class="btn-primary" onclick="closeRatingModal()" 
                        style="flex: 1; background: linear-gradient(135deg, #6B7280, #4B5563);">
                    ✖️ Annuler
                </button>
            </div>
        </div>
    `;
    
    openModal(ratingModal);
    
    // Réinitialiser la note
    selectedRatingQuickValue = 0;
    
    // Initialiser le système d'étoiles
    starRatingQuickInstance = createStarRating('starsInputQuick', 0, (rating) => {
        document.getElementById('selectedRatingQuick').textContent = rating;
        selectedRatingQuickValue = rating;
    });
}

// Variable globale pour la note sélectionnée
let selectedRatingQuickValue = 0;

// Confirmer la notation
function confirmRating() {
    if (selectedRatingQuickValue === 0) {
        showNotification('Veuillez sélectionner une note', 'error');
        return;
    }
    
    const comment = document.getElementById('commentTextareaQuick').value.trim();
    const anime = animesQueue[currentAnimeIndex];
    
    // Ajouter aux favoris avec la note et le commentaire
    authManager.addFavorite(anime, selectedRatingQuickValue, comment);
    
    rateCount++;
    updateFavoritesCount();
    
    closeModal(ratingModal);
    showNotification('Ajouté aux favoris ! ❤️', 'success');
    
    // Réinitialiser
    selectedRatingQuickValue = 0;
    
    // Passer à l'anime suivant
    nextAnime('right');
}

// Fermer la modale de notation
function closeRatingModal() {
    closeModal(ratingModal);
    selectedRatingQuickValue = 0;
    isProcessing = false;
}

// Mettre à jour les compteurs
function updateCounters() {
    skipCountElement.textContent = skipCount;
    rateCountElement.textContent = rateCount;
    totalCountElement.textContent = skipCount + rateCount;
}

// Afficher le message de fin
function showEndMessage() {
    quickRateContainer.style.display = 'none';
    endMessage.style.display = 'block';
}

// Recommencer
function restartQuickRate() {
    endMessage.style.display = 'none';
    loadAnimes();
}

// Créer une particule animée
function createParticle(emoji, sourceElement) {
    const rect = sourceElement.getBoundingClientRect();
    const particle = document.createElement('div');
    particle.className = 'heart-particle';
    particle.textContent = emoji;
    particle.style.left = `${rect.left + rect.width / 2}px`;
    particle.style.top = `${rect.top + rect.height / 2}px`;
    
    document.body.appendChild(particle);
    
    setTimeout(() => particle.remove(), 1000);
}

// Ouvrir la modale d'authentification
function openAuthModal() {
    openModal(document.getElementById('authModal'));
}

// Événements des boutons
skipBtn.addEventListener('click', skipAnime);
likeBtn.addEventListener('click', likeAnime);

// Support du clavier
document.addEventListener('keydown', (e) => {
    // Ignorer si on est en train de taper dans un champ de texte
    const isTyping = e.target.tagName === 'INPUT' || 
                     e.target.tagName === 'TEXTAREA' || 
                     e.target.isContentEditable;
    
    if (isTyping) return;
    if (quickRateContainer.style.display === 'none') return;
    if (isProcessing) return;
    
   
});

// Fermeture des modales
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', function() {
        const modal = this.closest('.modal');
        closeModal(modal);
        if (modal.id === 'ratingModal') {
            isProcessing = false;
        }
    });
});

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeModal(e.target);
        if (e.target.id === 'ratingModal') {
            isProcessing = false;
        }
    }
});

// Initialiser au chargement
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuickRate);
} else {
    initQuickRate();
}

