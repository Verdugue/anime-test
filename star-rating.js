// Système de notation par étoiles avec demi-étoiles
// Peut être utilisé dans n'importe quelle modale

function createStarRating(containerId, initialRating = 0, onRatingChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let currentRating = initialRating;
    let hoverRating = 0;

    // Créer 5 étoiles avec affichage en deux parties
    const starsHTML = Array.from({ length: 5 }, (_, index) => {
        const starNumber = index + 1;
        return `
            <div class="star-container" data-star="${starNumber}">
                <span class="star-empty">☆</span>
                <span class="star-fill-left">★</span>
                <span class="star-fill-right">★</span>
                <div class="star-left" data-value="${starNumber - 0.5}"></div>
                <div class="star-right" data-value="${starNumber}"></div>
            </div>
        `;
    }).join('');

    container.innerHTML = starsHTML;

    // Fonction pour mettre à jour l'affichage des étoiles
    function updateStars(rating) {
        const stars = container.querySelectorAll('.star-container');
        stars.forEach((star, index) => {
            const starValue = index + 1;
            const fillLeft = star.querySelector('.star-fill-left');
            const fillRight = star.querySelector('.star-fill-right');
            
            if (rating >= starValue) {
                // Étoile complète
                fillLeft.style.opacity = '1';
                fillRight.style.opacity = '1';
            } else if (rating >= starValue - 0.5) {
                // Demi-étoile (seulement la gauche)
                fillLeft.style.opacity = '1';
                fillRight.style.opacity = '0';
            } else {
                // Étoile vide
                fillLeft.style.opacity = '0';
                fillRight.style.opacity = '0';
            }
        });
    }

    // Gérer le survol
    container.addEventListener('mousemove', (e) => {
        const target = e.target.closest('.star-left, .star-right');
        if (target) {
            hoverRating = parseFloat(target.dataset.value);
            updateStars(hoverRating);
        }
    });

    // Gérer la sortie du survol
    container.addEventListener('mouseleave', () => {
        hoverRating = 0;
        updateStars(currentRating);
    });

    // Gérer le clic
    container.addEventListener('click', (e) => {
        const target = e.target.closest('.star-left, .star-right');
        if (target) {
            currentRating = parseFloat(target.dataset.value);
            updateStars(currentRating);
            if (onRatingChange) {
                onRatingChange(currentRating);
            }
        }
    });

    // Style initial
    const style = document.createElement('style');
    style.textContent = `
        .star-container {
            position: relative;
            display: inline-block;
            cursor: pointer;
            width: 1em;
            height: 1em;
            transition: transform 0.2s ease;
            user-select: none;
        }
        
        .star-container:hover {
            transform: scale(1.15);
        }
        
        .star-empty {
            position: absolute;
            top: 0;
            left: 0;
            color: #4B5563;
        }
        
        .star-fill-left, .star-fill-right {
            position: absolute;
            top: 0;
            left: 0;
            color: #FFD700;
            text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
            transition: opacity 0.2s ease;
            opacity: 0;
        }
        
        .star-fill-left {
            clip-path: polygon(0 0, 50% 0, 50% 100%, 0 100%);
        }
        
        .star-fill-right {
            clip-path: polygon(50% 0, 100% 0, 100% 100%, 50% 100%);
        }
        
        .star-left, .star-right {
            position: absolute;
            top: 0;
            width: 50%;
            height: 100%;
            z-index: 2;
        }
        
        .star-left {
            left: 0;
        }
        
        .star-right {
            right: 0;
        }
    `;
    
    if (!document.getElementById('star-rating-styles')) {
        style.id = 'star-rating-styles';
        document.head.appendChild(style);
    }

    // Initialiser l'affichage
    updateStars(currentRating);

    // Retourner une API pour manipuler le rating
    return {
        setRating: (rating) => {
            currentRating = rating;
            updateStars(currentRating);
        },
        getRating: () => currentRating,
        reset: () => {
            currentRating = 0;
            updateStars(0);
        }
    };
}

