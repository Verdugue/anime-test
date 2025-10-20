// Script pour la page des favoris

// Éléments DOM
const favoritesContainer = document.getElementById('favoritesContainer');
const loginRequired = document.getElementById('loginRequired');
const emptyFavorites = document.getElementById('emptyFavorites');
const userGreeting = document.getElementById('userGreeting');
const editFavoriteModal = document.getElementById('editFavoriteModal');

// Initialiser la page
function initFavoritesPage() {
    updateAuthButton();
    
    if (!authManager.isLoggedIn()) {
        showLoginRequired();
        return;
    }
    
    updateUserGreeting();
    displayFavorites();
}

// Afficher le message de connexion requise
function showLoginRequired() {
    loginRequired.style.display = 'block';
    emptyFavorites.style.display = 'none';
    favoritesContainer.style.display = 'none';
}

// Mettre à jour le message de bienvenue
function updateUserGreeting() {
    const user = authManager.getCurrentUser();
    if (user) {
        userGreeting.textContent = `Bienvenue ${user.username} ! Voici vos animes préférés`;
    }
}

// Afficher les favoris
function displayFavorites() {
    const favorites = authManager.getFavorites();
    
    if (favorites.length === 0) {
        favoritesContainer.style.display = 'none';
        emptyFavorites.style.display = 'block';
        loginRequired.style.display = 'none';
        return;
    }
    
    favoritesContainer.style.display = 'grid';
    emptyFavorites.style.display = 'none';
    loginRequired.style.display = 'none';
    
    // Trier par date d'ajout (plus récent en premier)
    const sortedFavorites = [...favorites].sort((a, b) => {
        return new Date(b.addedAt || 0) - new Date(a.addedAt || 0);
    });
    
    favoritesContainer.innerHTML = sortedFavorites.map(fav => createFavoriteCard(fav)).join('');
}

// Créer une carte de favori
function createFavoriteCard(favorite) {
    const imageUrl = favorite.images?.jpg?.large_image_url || favorite.images?.jpg?.image_url || '';
    const title = favorite.title || 'Sans titre';
    const rating = favorite.userRating || 0;
    const comment = favorite.userComment || '';
    const addedDate = favorite.addedAt ? new Date(favorite.addedAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }) : '';
    
    const score = favorite.score || 'N/A';
    const type = favorite.type || 'TV';
    const episodes = favorite.episodes ? `${favorite.episodes} ep` : 'En cours';
    
    return `
        <div class="favorite-item" data-anime-id="${favorite.mal_id}">
            <img src="${imageUrl}" 
                 alt="${title}" 
                 class="favorite-item-image"
                 onerror="this.src='https://via.placeholder.com/200x280?text=No+Image'">
            
            <div class="favorite-item-content">
                <h3 class="favorite-item-title">${title}</h3>
                
                <div class="favorite-item-meta">
                    <span class="meta-tag">📺 ${type}</span>
                    <span class="meta-tag">🎬 ${episodes}</span>
                    <span class="meta-tag">⭐ Score MAL: ${score}</span>
                </div>
                
                <div class="favorite-item-rating">
                    <strong style="color: var(--text-secondary);">Ma note:</strong>
                    <div class="star-display">
                        ${generateStarDisplay(rating)}
                    </div>
                    <span class="rating-number">${rating}/5</span>
                </div>
                
                ${comment ? `
                    <div class="favorite-item-comment">
                        <strong style="color: var(--text-primary); display: block; margin-bottom: 0.5rem;">💬 Mon avis:</strong>
                        ${comment}
                    </div>
                ` : ''}
                
                ${addedDate ? `<div class="favorite-item-date">Ajouté le ${addedDate}</div>` : ''}
            </div>
            
            <div class="favorite-item-actions">
                <button class="action-btn" onclick="editFavorite(${favorite.mal_id})">
                    ✏️ Modifier
                </button>
                <button class="action-btn delete" onclick="removeFavoriteFromPage(${favorite.mal_id})">
                    🗑️ Retirer
                </button>
            </div>
        </div>
    `;
}

// Générer l'affichage des étoiles
function generateStarDisplay(rating) {
    let stars = '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    // Étoiles pleines
    for (let i = 0; i < fullStars; i++) {
        stars += '<span class="star">★</span>';
    }
    
    // Demi-étoile
    if (hasHalfStar) {
        stars += '<span class="star">⯨</span>';
    }
    
    // Étoiles vides
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        stars += '<span class="star empty">☆</span>';
    }
    
    return stars;
}

// Modifier un favori
let starRatingEditInstance = null;

function editFavorite(animeId) {
    const favorite = authManager.getFavorites().find(f => f.mal_id === animeId);
    if (!favorite) return;
    
    const currentRating = favorite.userRating || 0;
    const currentComment = favorite.userComment || '';
    
    const modalContent = document.getElementById('editFavoriteContent');
    modalContent.innerHTML = `
        <div class="edit-favorite-form">
            <h3 style="color: var(--text-primary); margin-bottom: 1rem;">${favorite.title}</h3>
            
            <div class="star-rating-input">
                <label>Ma note:</label>
                <div class="stars-input" id="starsInputEdit"></div>
                <div style="color: var(--text-secondary); margin-top: 0.5rem;">
                    Note sélectionnée: <span id="selectedRating">${currentRating}</span>/5
                </div>
            </div>
            
            <div class="comment-input">
                <label>Mon commentaire:</label>
                <textarea id="commentTextarea" placeholder="Partagez votre avis sur cet anime...">${currentComment}</textarea>
            </div>
            
            <button class="btn-primary" onclick="saveEditedFavorite(${animeId})">
                💾 Enregistrer les modifications
            </button>
        </div>
    `;
    
    openModal(editFavoriteModal);
    
    // Initialiser la note actuelle
    selectedRatingValue = currentRating;
    
    // Initialiser le système d'étoiles avec la note actuelle
    starRatingEditInstance = createStarRating('starsInputEdit', currentRating, (rating) => {
        document.getElementById('selectedRating').textContent = rating;
        selectedRatingValue = rating;
    });
}

// Sélectionner une note
let selectedRatingValue = 0;

// Sauvegarder les modifications
function saveEditedFavorite(animeId) {
    const comment = document.getElementById('commentTextarea').value.trim();
    
    if (selectedRatingValue === 0) {
        showNotification('Veuillez sélectionner une note', 'error');
        return;
    }
    
    authManager.updateFavorite(animeId, selectedRatingValue, comment);
    closeModal(editFavoriteModal);
    displayFavorites();
    updateFavoritesCount();
    showNotification('Modifications enregistrées !', 'success');
}

// Retirer un favori
function removeFavoriteFromPage(animeId) {
    if (confirm('Êtes-vous sûr de vouloir retirer cet anime de vos favoris ?')) {
        authManager.removeFavorite(animeId);
        displayFavorites();
        updateFavoritesCount();
        showNotification('Retiré des favoris', 'info');
    }
}

// Ouvrir la modale d'authentification
function openAuthModal() {
    openModal(document.getElementById('authModal'));
}

// Fermeture des modales
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', function() {
        closeModal(this.closest('.modal'));
    });
});

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeModal(e.target);
    }
});

// Initialiser la page au chargement
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFavoritesPage);
} else {
    initFavoritesPage();
}

