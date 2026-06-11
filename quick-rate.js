// Script pour la notation rapide — layout éditorial Favanim

// Configuration
const ANIMES_PER_SESSION = 20;
const JIKAN_API_BASE = 'https://api.jikan.moe/v4';

// État de l'application
let currentAnimeIndex = 0;
let animesQueue = [];
let skipCount = 0;
let rateCount = 0;
let isProcessing = false;
let currentRatingValue = 0;
let qrStarsInstance = null;

// Éléments DOM
const quickRateContainer = document.getElementById('quickRateContainer');
const loginRequired = document.getElementById('loginRequired');
const loadingQuick = document.getElementById('loadingQuick');
const endMessage = document.getElementById('endMessage');
const skipBtn = document.getElementById('skipBtn');
const validateBtn = document.getElementById('validateBtn');

const qrCard = document.getElementById('qrCard');
const qrCover = document.getElementById('qrCover');
const qrCoverNum = document.getElementById('qrCoverNum');
const qrJp = document.getElementById('qrJp');
const qrTitle = document.getElementById('qrTitle');
const qrMeta = document.getElementById('qrMeta');
const qrSynopsis = document.getElementById('qrSynopsis');
const qrRateLabel = document.getElementById('qrRateLabel');
const qrComment = document.getElementById('qrComment');
const qrCounter = document.getElementById('qrCounter');
const qrBarFill = document.getElementById('qrBarFill');
const qrRated = document.getElementById('qrRated');

// Libellés de note
const RATE_LABELS = {
    0: 'Clique pour noter',
    1: '→ Pas pour moi',
    2: '→ Bof',
    3: '→ Correct',
    4: '→ Très bien',
    5: "→ Chef d'œuvre"
};

// Initialisation - VERSION SIMPLIFIÉE
async function initQuickRate() {
    updateAuthButton();

    // Attendre que Firebase Auth soit prêt
    if (!authManager.auth) {
        setTimeout(initQuickRate, 100);
        return;
    }

    // Attendre jusqu'à 5 secondes que l'utilisateur soit chargé
    let attempts = 0;
    const maxAttempts = 50;

    const checkUser = async () => {
        attempts++;

        if (authManager.isLoggedIn()) {
            await loadAnimes();
        } else if (attempts >= maxAttempts) {
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
        if (authManager.isLoggedIn()) {
            const favorites = await authManager.getFavorites();
            const favoriteIds = favorites.map(fav => fav.mal_id);
            animesQueue = animesQueue.filter(anime => !favoriteIds.includes(anime.mal_id));
        }

        if (animesQueue.length === 0) {
            loadingQuick.style.display = 'none';
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
async function displayCurrentAnime() {
    if (currentAnimeIndex >= animesQueue.length) {
        showEndMessage();
        return;
    }

    const anime = animesQueue[currentAnimeIndex];

    // Vérifier si cet anime est déjà en favoris
    const isFavorite = await authManager.isFavorite(anime.mal_id);
    if (isFavorite) {
        console.log(`Anime ${anime.title} déjà en favoris, skip automatique`);
        currentAnimeIndex++;
        displayCurrentAnime(); // Passer au suivant récursivement
        return;
    }

    const imageUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '';
    const title = anime.title || anime.title_english || 'Sans titre';
    const titleJp = anime.title_japanese || '';
    const score = anime.score != null ? anime.score.toFixed(1) : 'N/A';
    const type = anime.type || 'TV';
    const episodes = anime.episodes ? `${anime.episodes} ép.` : 'En cours';
    const year = anime.year || anime.aired?.prop?.from?.year || '';
    const studio = anime.studios?.[0]?.name || '';
    const synopsis = anime.synopsis || 'Pas de synopsis disponible.';

    // Remplir la carte
    qrCover.style.display = '';
    qrCover.src = imageUrl;
    qrCoverNum.textContent = `№ ${String(currentAnimeIndex + 1).padStart(2, '0')}`;
    qrJp.textContent = titleJp;
    qrTitle.textContent = title;
    qrSynopsis.textContent = synopsis;
    qrMeta.innerHTML = `
        <span class="tag accent">${type}</span>
        ${year ? `<span class="tag">${year}</span>` : ''}
        <span class="tag">${episodes}</span>
        ${studio ? `<span class="tag">${studio}</span>` : ''}
        <span class="tag">★ ${score}</span>
    `;

    // Réinitialiser la note et le commentaire
    currentRatingValue = 0;
    qrRateLabel.textContent = RATE_LABELS[0];
    qrComment.value = '';
    qrStarsInstance = createStarRating('qrStars', 0, (rating) => {
        currentRatingValue = rating;
        qrRateLabel.textContent = RATE_LABELS[Math.ceil(rating)] || RATE_LABELS[0];
    });

    // Rejouer l'animation d'apparition
    qrCard.classList.remove('fade-up');
    void qrCard.offsetWidth;
    qrCard.classList.add('fade-up');

    updateCounters();
}

// Passer à l'anime suivant
async function nextAnime() {
    if (isProcessing) return;
    isProcessing = true;

    currentAnimeIndex++;
    updateCounters();
    await displayCurrentAnime();

    isProcessing = false;
}

// Ignorer l'anime
function skipAnime() {
    if (isProcessing) return;

    skipCount++;
    nextAnime();
}

// Valider la note → ajout aux favoris
async function validateRating() {
    if (isProcessing) return;

    if (currentRatingValue === 0) {
        showNotification('Veuillez sélectionner une note', 'error');
        return;
    }

    const anime = animesQueue[currentAnimeIndex];
    const comment = qrComment.value.trim();

    try {
        await authManager.addFavorite(anime, currentRatingValue, comment);

        rateCount++;
        await updateFavoritesCount();
        showNotification('Ajouté aux favoris ♥', 'success');

        nextAnime();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Mettre à jour la barre de progression et les compteurs
function updateCounters() {
    const total = animesQueue.length;
    const position = Math.min(currentAnimeIndex + 1, total);

    qrCounter.textContent = `${position} / ${total}`;
    qrBarFill.style.width = total > 0 ? `${(position / total) * 100}%` : '0%';
    qrRated.textContent = `${rateCount} noté${rateCount > 1 ? 's' : ''} · ${skipCount} passé${skipCount > 1 ? 's' : ''}`;
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

// Ouvrir la modale d'authentification
function openAuthModal() {
    openModal(document.getElementById('authModal'));
}

// Événements des boutons
skipBtn.addEventListener('click', skipAnime);
validateBtn.addEventListener('click', validateRating);

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

// Initialiser au chargement
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuickRate);
} else {
    initQuickRate();
}
