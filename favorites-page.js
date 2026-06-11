// Script pour la page des favoris

// Éléments DOM
const favoritesContainer = document.getElementById('favoritesContainer');
const loginRequired = document.getElementById('loginRequired');
const emptyFavorites = document.getElementById('emptyFavorites');
const userGreeting = document.getElementById('userGreeting');
const editFavoriteModal = document.getElementById('editFavoriteModal');

// Initialiser la page - VERSION SIMPLIFIÉE ET FIABLE
async function initFavoritesPage() {
    console.log('🚀 initFavoritesPage() appelée');
    updateAuthButton();
    
    // Afficher un loading
    favoritesContainer.innerHTML = '<div class="loading" style="grid-column: 1/-1; background: var(--bg);"><div class="spinner"></div><p>Chargement de vos favoris…</p></div>';
    
    // Attendre que Firebase Auth soit prêt
    if (!authManager.auth) {
        setTimeout(initFavoritesPage, 100);
        return;
    }
    
    // Attendre jusqu'à 5 secondes que l'utilisateur soit chargé
    let attempts = 0;
    const maxAttempts = 50; // 5 secondes (50 x 100ms)
    
    const checkUser = async () => {
        attempts++;
        console.log(`Tentative ${attempts}/${maxAttempts}, isLoggedIn:`, authManager.isLoggedIn());
        
        if (authManager.isLoggedIn()) {
            console.log('✅ Utilisateur connecté, chargement des favoris');
            updateUserGreeting();
            await displayFavorites();
        } else if (attempts >= maxAttempts) {
            console.log('❌ Timeout, pas d\'utilisateur');
            showLoginRequired();
        } else {
            setTimeout(checkUser, 100);
        }
    };
    
    checkUser();
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

// Mettre à jour les statistiques d'en-tête (nombre + note moyenne)
function updateFavStats(favorites) {
    const countEl = document.getElementById('favStatCount');
    const avgEl = document.getElementById('favStatAvg');
    if (countEl) countEl.textContent = favorites.length;
    if (avgEl) {
        const rated = favorites.filter(f => f.userRating > 0);
        avgEl.textContent = rated.length
            ? (rated.reduce((s, f) => s + f.userRating, 0) / rated.length).toFixed(1)
            : '—';
    }
}

// Afficher les favoris
async function displayFavorites() {
    console.log('🔍 displayFavorites() appelée');
    const favorites = await authManager.getFavorites(true);
    console.log('📊 Favoris récupérés:', favorites.length, favorites);

    updateFavStats(favorites);

    if (favorites.length === 0) {
        console.log('⚠️ Aucun favori trouvé, affichage du message vide');
        favoritesContainer.style.display = 'none';
        emptyFavorites.style.display = 'block';
        loginRequired.style.display = 'none';
        return;
    }

    console.log('✅ Affichage de', favorites.length, 'favoris');
    favoritesContainer.style.display = 'grid';
    emptyFavorites.style.display = 'none';
    loginRequired.style.display = 'none';

    // Trier par date d'ajout (plus récent en premier)
    const sortedFavorites = [...favorites].sort((a, b) => {
        return new Date(b.addedAt || 0) - new Date(a.addedAt || 0);
    });

    favoritesContainer.innerHTML = sortedFavorites.map((fav, idx) => createFavoriteCard(fav, idx)).join('');
}

// Créer une carte de favori (style éditorial)
function createFavoriteCard(favorite, idx = 0) {
    const imageUrl = favorite.images?.jpg?.large_image_url || favorite.images?.jpg?.image_url || '';
    const title = favorite.title || 'Sans titre';
    const rating = favorite.userRating || 0;
    const comment = favorite.userComment || '';
    const addedDate = favorite.addedAt ? new Date(favorite.addedAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }) : '';

    const score = favorite.score != null ? favorite.score : 'N/A';
    const type = favorite.type || 'TV';
    const episodes = favorite.episodes ? `${favorite.episodes} ép.` : 'En cours';
    const num = String(idx + 1).padStart(3, '0');

    return `
        <article class="card fav-card" data-anime-id="${favorite.mal_id}"
                 onclick="window.location.href='anime.html?id=${favorite.mal_id}'" style="cursor: pointer;">
            <div class="card-media">
                <img src="${imageUrl}" alt="${title}" loading="lazy"
                     onerror="this.style.display='none'">
                <div class="card-num t-mono">№ ${num}</div>
            </div>
            <div class="card-body">
                <div class="card-meta-row">
                    <span class="tag accent">${type}</span>
                    <span class="card-score">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7 7.5.5-5.7 5 1.7 7.5L12 18l-6.5 4 1.7-7.5L1.5 9.5 9 9z"/></svg>
                        <span>${score}</span>
                    </span>
                </div>
                <h3 class="card-title">${title}</h3>
                <div class="card-year t-mono">${episodes}</div>

                <div class="fav-rating">
                    <span class="t-eyebrow">Ma note</span>
                    <div class="star-display">
                        ${generateStarDisplay(rating)}
                    </div>
                    <span class="fav-rating-num">${rating}/5</span>
                </div>

                ${comment ? `<div class="fav-comment">« ${comment} »</div>` : ''}

                ${addedDate ? `<div class="fav-date">Ajouté le ${addedDate}</div>` : ''}

                <div class="fav-actions">
                    <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); editFavorite(${favorite.mal_id})">
                        Modifier
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); removeFavoriteFromPage(${favorite.mal_id})">
                        Retirer
                    </button>
                </div>
            </div>
        </article>
    `;
}

// Générer l'affichage des étoiles (sans demi-étoiles)
function generateStarDisplay(rating) {
    let stars = '';
    const fullStars = Math.floor(rating);
    
    // Étoiles pleines
    for (let i = 0; i < fullStars; i++) {
        stars += '<span class="star">★</span>';
    }
    
    // Étoiles vides
    const emptyStars = 5 - fullStars;
    for (let i = 0; i < emptyStars; i++) {
        stars += '<span class="star empty">☆</span>';
    }
    
    return stars;
}

// Modifier un favori
let starRatingEditInstance = null;

async function editFavorite(animeId) {
    const favorites = await authManager.getFavorites();
    const favorite = favorites.find(f => f.mal_id === animeId);
    if (!favorite) return;
    
    const currentRating = favorite.userRating || 0;
    const currentComment = favorite.userComment || '';
    
    const modalContent = document.getElementById('editFavoriteContent');
    const editImageUrl = favorite.images?.jpg?.large_image_url || favorite.images?.jpg?.image_url || '';
    modalContent.innerHTML = `
        <div class="rate-form">
            <div class="rate-form-anime">
                ${editImageUrl ? `<img src="${editImageUrl}" alt="${favorite.title}">` : ''}
                <div>
                    <div class="rate-form-anime-title">${favorite.title}</div>
                    <div class="rate-form-anime-sub">${favorite.type || 'TV'} · ${favorite.episodes || '?'} épisodes</div>
                </div>
            </div>

            <div>
                <div class="t-eyebrow">Ma note *</div>
                <div class="stars-input" id="starsInputEdit" style="margin-top: 10px;"></div>
                <div class="rate-value t-mono">Note sélectionnée : <strong id="selectedRating">${currentRating}</strong>/5</div>
            </div>

            <div>
                <div class="t-eyebrow" style="margin-bottom: 8px;">Mon commentaire</div>
                <textarea id="commentTextarea" class="input-area" placeholder="Partagez votre avis sur cet anime…">${currentComment}</textarea>
            </div>

            <button class="btn btn-primary" onclick="saveEditedFavorite(${animeId})">
                Enregistrer les modifications →
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
async function saveEditedFavorite(animeId) {
    const comment = document.getElementById('commentTextarea').value.trim();
    
    if (selectedRatingValue === 0) {
        showNotification('Veuillez sélectionner une note', 'error');
        return;
    }
    
    try {
        await authManager.updateFavorite(animeId, selectedRatingValue, comment);
        closeModal(editFavoriteModal);
        await displayFavorites();
        await updateFavoritesCount();
        showNotification('Modifications enregistrées !', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Retirer un favori
async function removeFavoriteFromPage(animeId) {
    if (confirm('Êtes-vous sûr de vouloir retirer cet anime de vos favoris ?')) {
        try {
            await authManager.removeFavorite(animeId);
            await displayFavorites();
            await updateFavoritesCount();
            showNotification('Retiré des favoris', 'info');
        } catch (error) {
            showNotification(error.message, 'error');
        }
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

