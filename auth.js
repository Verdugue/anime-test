// ===== Gestion de l'authentification et des favoris =====

class AuthManager {
    constructor() {
        this.currentUser = this.loadCurrentUser();
        this.users = this.loadUsers();
    }

    // Charger l'utilisateur actuel depuis localStorage
    loadCurrentUser() {
        const user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    }

    // Charger tous les utilisateurs depuis localStorage
    loadUsers() {
        const users = localStorage.getItem('users');
        return users ? JSON.parse(users) : [];
    }

    // Sauvegarder les utilisateurs dans localStorage
    saveUsers() {
        localStorage.setItem('users', JSON.stringify(this.users));
    }

    // Sauvegarder l'utilisateur actuel
    saveCurrentUser() {
        if (this.currentUser) {
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            // Mettre à jour l'utilisateur dans la liste
            const index = this.users.findIndex(u => u.email === this.currentUser.email);
            if (index !== -1) {
                this.users[index] = this.currentUser;
                this.saveUsers();
            }
        } else {
            localStorage.removeItem('currentUser');
        }
    }

    // Inscription
    register(username, email, password) {
        // Vérifier si l'email existe déjà
        if (this.users.some(u => u.email === email)) {
            throw new Error('Cet email est déjà utilisé');
        }

        const newUser = {
            username,
            email,
            password, // Note: Dans une vraie app, il faudrait hasher le mot de passe
            favorites: [],
            createdAt: new Date().toISOString()
        };

        this.users.push(newUser);
        this.saveUsers();
        this.currentUser = newUser;
        this.saveCurrentUser();
        
        return newUser;
    }

    // Connexion
    login(email, password) {
        const user = this.users.find(u => u.email === email && u.password === password);
        
        if (!user) {
            throw new Error('Email ou mot de passe incorrect');
        }

        this.currentUser = user;
        this.saveCurrentUser();
        
        return user;
    }

    // Déconnexion
    logout() {
        this.currentUser = null;
        this.saveCurrentUser();
    }

    // Vérifier si l'utilisateur est connecté
    isLoggedIn() {
        return this.currentUser !== null;
    }

    // Obtenir l'utilisateur actuel
    getCurrentUser() {
        return this.currentUser;
    }

    // Ajouter un anime aux favoris
    addFavorite(anime, rating = 0, comment = '') {
        if (!this.isLoggedIn()) {
            throw new Error('Vous devez être connecté pour ajouter des favoris');
        }

        // Vérifier si l'anime n'est pas déjà dans les favoris
        if (!this.currentUser.favorites.some(fav => fav.mal_id === anime.mal_id)) {
            const favoriteAnime = {
                ...anime,
                userRating: rating,
                userComment: comment,
                addedAt: new Date().toISOString()
            };
            this.currentUser.favorites.push(favoriteAnime);
            this.saveCurrentUser();
            return true;
        }
        return false;
    }

    // Mettre à jour un favori (note et commentaire)
    updateFavorite(animeId, rating, comment) {
        if (!this.isLoggedIn()) {
            throw new Error('Vous devez être connecté');
        }

        const index = this.currentUser.favorites.findIndex(fav => fav.mal_id === animeId);
        if (index !== -1) {
            this.currentUser.favorites[index].userRating = rating;
            this.currentUser.favorites[index].userComment = comment;
            this.saveCurrentUser();
            return true;
        }
        return false;
    }

    // Retirer un anime des favoris
    removeFavorite(animeId) {
        if (!this.isLoggedIn()) {
            throw new Error('Vous devez être connecté');
        }

        this.currentUser.favorites = this.currentUser.favorites.filter(
            fav => fav.mal_id !== animeId
        );
        this.saveCurrentUser();
    }

    // Vérifier si un anime est dans les favoris
    isFavorite(animeId) {
        if (!this.isLoggedIn()) {
            return false;
        }

        return this.currentUser.favorites.some(fav => fav.mal_id === animeId);
    }

    // Obtenir tous les favoris
    getFavorites() {
        if (!this.isLoggedIn()) {
            return [];
        }
        return this.currentUser.favorites || [];
    }

    // Obtenir le nombre de favoris
    getFavoritesCount() {
        return this.getFavorites().length;
    }
}

// Instance globale du gestionnaire d'authentification
const authManager = new AuthManager();

// ===== Gestion de l'interface utilisateur =====

// Modales
const authModal = document.getElementById('authModal');

// Boutons
const authBtn = document.getElementById('authBtn');

// Formulaires
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginFormElement = document.getElementById('loginFormElement');
const registerFormElement = document.getElementById('registerFormElement');

// Liens de switch
const showRegisterLink = document.getElementById('showRegister');
const showLoginLink = document.getElementById('showLogin');

// Compteur de favoris
const favCountElement = document.getElementById('favCount');

// Initialisation de l'interface
function initAuthUI() {
    updateAuthButton();
    updateFavoritesCount();

    // Événements des boutons
    authBtn.addEventListener('click', () => {
        if (authManager.isLoggedIn()) {
            if (confirm('Voulez-vous vous déconnecter ?')) {
                authManager.logout();
                updateAuthButton();
                updateFavoritesCount();
                showNotification('Déconnecté avec succès', 'success');
                // Rafraîchir l'affichage des favoris sur les cartes
                if (typeof updateFavoriteButtons === 'function') {
                    updateFavoriteButtons();
                }
            }
        } else {
            openModal(authModal);
        }
    });


    // Switch entre login et register
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.classList.remove('active');
        loginForm.classList.add('active');
    });

    // Soumission formulaire de connexion
    loginFormElement.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            authManager.login(email, password);
            closeModal(authModal);
            updateAuthButton();
            updateFavoritesCount();
            showNotification(`Bienvenue ${authManager.getCurrentUser().username} !`, 'success');
            loginFormElement.reset();
            // Rafraîchir l'affichage des favoris sur les cartes
            if (typeof updateFavoriteButtons === 'function') {
                updateFavoriteButtons();
            }
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });

    // Soumission formulaire d'inscription
    registerFormElement.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

        if (password !== passwordConfirm) {
            showNotification('Les mots de passe ne correspondent pas', 'error');
            return;
        }

        if (password.length < 6) {
            showNotification('Le mot de passe doit contenir au moins 6 caractères', 'error');
            return;
        }

        try {
            authManager.register(username, email, password);
            closeModal(authModal);
            updateAuthButton();
            updateFavoritesCount();
            showNotification(`Bienvenue ${username} ! Votre compte a été créé.`, 'success');
            registerFormElement.reset();
            registerForm.classList.remove('active');
            loginForm.classList.add('active');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });

    // Fermeture des modales
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            closeModal(this.closest('.modal'));
        });
    });

    // Fermeture au clic en dehors
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });
}

// Mettre à jour le bouton d'authentification
function updateAuthButton() {
    if (authManager.isLoggedIn()) {
        const user = authManager.getCurrentUser();
        authBtn.textContent = `👤 ${user.username}`;
        authBtn.style.background = 'linear-gradient(135deg, #8B5CF6, #EC4899)';
    } else {
        authBtn.textContent = 'Se connecter';
    }
}

// Mettre à jour le compteur de favoris
function updateFavoritesCount() {
    const count = authManager.getFavoritesCount();
    favCountElement.textContent = count;
}


// Ouvrir une modale
function openModal(modal) {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Fermer une modale
function closeModal(modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Afficher une notification
function showNotification(message, type = 'info') {
    // Créer l'élément de notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Styles inline
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 1rem 2rem;
        border-radius: 15px;
        color: white;
        font-weight: 600;
        z-index: 3000;
        animation: slideInRight 0.4s ease;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        max-width: 400px;
    `;

    // Couleurs selon le type
    switch(type) {
        case 'success':
            notification.style.background = 'linear-gradient(135deg, #10B981, #059669)';
            break;
        case 'error':
            notification.style.background = 'linear-gradient(135deg, #EF4444, #DC2626)';
            break;
        case 'info':
            notification.style.background = 'linear-gradient(135deg, #8B5CF6, #EC4899)';
            break;
    }

    document.body.appendChild(notification);

    // Retirer après 3 secondes
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.4s ease';
        setTimeout(() => notification.remove(), 400);
    }, 3000);
}

// Ajouter les animations CSS pour les notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialiser l'interface au chargement de la page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthUI);
} else {
    initAuthUI();
}

