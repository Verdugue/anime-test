// ===== Gestion de l'authentification avec Firebase =====

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.auth = window.firebaseAuth;
        this.db = window.firebaseDB;
        
        // Écouter les changements d'authentification
        if (this.auth) {
            this.auth.onAuthStateChanged(async (user) => {
                if (user) {
                    // Utilisateur connecté
                    await this.loadUserData(user);
                    console.log('✅ Utilisateur connecté:', user.email);
                } else {
                    // Utilisateur déconnecté
                    this.currentUser = null;
                    console.log('ℹ️ Utilisateur déconnecté');
                }
                
                // Mettre à jour l'interface
                if (typeof updateAuthButton === 'function') {
                    updateAuthButton();
                }
                if (typeof updateFavoritesCount === 'function') {
                    updateFavoritesCount();
                }
            });
        }
    }

    // Charger les données utilisateur depuis Firestore
    async loadUserData(firebaseUser) {
        try {
            const userDoc = await this.db.collection('users').doc(firebaseUser.uid).get();
            
            if (userDoc.exists) {
                this.currentUser = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    username: userDoc.data().username || firebaseUser.email.split('@')[0],
                    favorites: [],
                    createdAt: userDoc.data().createdAt || new Date().toISOString()
                };
            } else {
                // Créer le document utilisateur s'il n'existe pas
                const username = firebaseUser.email.split('@')[0];
                await this.db.collection('users').doc(firebaseUser.uid).set({
                    username: username,
                    email: firebaseUser.email,
                    createdAt: new Date().toISOString()
                });
                
                this.currentUser = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    username: username,
                    favorites: [],
                    createdAt: new Date().toISOString()
                };
            }
        } catch (error) {
            console.error('Erreur lors du chargement des données utilisateur:', error);
        }
    }

    // Inscription
    async register(username, email, password) {
        try {
            // Créer l'utilisateur dans Firebase Auth
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Créer le document utilisateur dans Firestore
            await this.db.collection('users').doc(user.uid).set({
                username: username,
                email: email,
                createdAt: new Date().toISOString()
            });
            
            // Mettre à jour le profil
            await user.updateProfile({
                displayName: username
            });
            
            this.currentUser = {
                uid: user.uid,
                email: email,
                username: username,
                favorites: [],
                createdAt: new Date().toISOString()
            };
            
            return this.currentUser;
        } catch (error) {
            console.error('Erreur d\'inscription:', error);
            
            // Messages d'erreur en français
            switch (error.code) {
                case 'auth/email-already-in-use':
                    throw new Error('Cet email est déjà utilisé');
                case 'auth/invalid-email':
                    throw new Error('Email invalide');
                case 'auth/weak-password':
                    throw new Error('Le mot de passe doit contenir au moins 6 caractères');
                default:
                    throw new Error('Erreur lors de l\'inscription: ' + error.message);
            }
        }
    }

    // Connexion
    async login(email, password) {
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            await this.loadUserData(userCredential.user);
            return this.currentUser;
        } catch (error) {
            console.error('Erreur de connexion:', error);
            
            // Messages d'erreur en français
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    throw new Error('Email ou mot de passe incorrect');
                case 'auth/invalid-email':
                    throw new Error('Email invalide');
                case 'auth/user-disabled':
                    throw new Error('Ce compte a été désactivé');
                default:
                    throw new Error('Erreur de connexion: ' + error.message);
            }
        }
    }

    // Déconnexion
    async logout() {
        try {
            await this.auth.signOut();
            this.currentUser = null;
        } catch (error) {
            console.error('Erreur de déconnexion:', error);
            throw new Error('Erreur lors de la déconnexion');
        }
    }

    // Vérifier si l'utilisateur est connecté
    isLoggedIn() {
        return this.currentUser !== null && this.auth.currentUser !== null;
    }

    // Obtenir l'utilisateur actuel
    getCurrentUser() {
        return this.currentUser;
    }

    // Ajouter un anime aux favoris
    async addFavorite(anime, rating = 0, comment = '') {
        if (!this.isLoggedIn()) {
            throw new Error('Vous devez être connecté pour ajouter des favoris');
        }

        try {
            const favoriteData = {
                animeId: anime.mal_id,
                title: anime.title,
                titleEnglish: anime.title_english || '',
                image: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '',
                type: anime.type || 'TV',
                episodes: anime.episodes || null,
                score: anime.score || null,
                userRating: rating,
                userComment: comment,
                addedAt: firebase.firestore.FieldValue.serverTimestamp(),
                userId: this.currentUser.uid
            };

            // Ajouter aux favoris dans Firestore
            await this.db.collection('favorites').doc(`${this.currentUser.uid}_${anime.mal_id}`).set(favoriteData);
            
            // Mettre à jour les statistiques de la communauté
            await this.updateCommunityStats(anime.mal_id, rating);
            
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'ajout aux favoris:', error);
            throw new Error('Impossible d\'ajouter aux favoris');
        }
    }

    // Mettre à jour les statistiques communautaires
    async updateCommunityStats(animeId, rating) {
        try {
            const statRef = this.db.collection('community_stats').doc(animeId.toString());
            const statDoc = await statRef.get();

            if (statDoc.exists) {
                const currentData = statDoc.data();
                const newCount = (currentData.count || 0) + 1;
                const newTotal = (currentData.totalRating || 0) + rating;
                
                await statRef.update({
                    count: newCount,
                    totalRating: newTotal,
                    averageRating: newTotal / newCount,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                await statRef.set({
                    count: 1,
                    totalRating: rating,
                    averageRating: rating,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Erreur lors de la mise à jour des stats:', error);
        }
    }

    // Mettre à jour un favori
    async updateFavorite(animeId, rating, comment) {
        if (!this.isLoggedIn()) {
            throw new Error('Vous devez être connecté');
        }

        try {
            const docId = `${this.currentUser.uid}_${animeId}`;
            await this.db.collection('favorites').doc(docId).update({
                userRating: rating,
                userComment: comment,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return true;
        } catch (error) {
            console.error('Erreur lors de la mise à jour:', error);
            throw new Error('Impossible de mettre à jour le favori');
        }
    }

    // Retirer un anime des favoris
    async removeFavorite(animeId) {
        if (!this.isLoggedIn()) {
            throw new Error('Vous devez être connecté');
        }

        try {
            const docId = `${this.currentUser.uid}_${animeId}`;
            await this.db.collection('favorites').doc(docId).delete();
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            throw new Error('Impossible de retirer des favoris');
        }
    }

    // Vérifier si un anime est dans les favoris
    async isFavorite(animeId) {
        if (!this.isLoggedIn()) {
            return false;
        }

        try {
            const docId = `${this.currentUser.uid}_${animeId}`;
            const doc = await this.db.collection('favorites').doc(docId).get();
            return doc.exists;
        } catch (error) {
            console.error('Erreur lors de la vérification:', error);
            return false;
        }
    }

    // Obtenir tous les favoris (avec cache local)
    _favoritesCache = null;
    _favoritesCacheTime = null;
    
    async getFavorites(forceRefresh = false) {
        if (!this.isLoggedIn()) {
            return [];
        }

        // Cache de 30 secondes
        const now = Date.now();
        if (!forceRefresh && this._favoritesCache && this._favoritesCacheTime && (now - this._favoritesCacheTime < 30000)) {
            return this._favoritesCache;
        }

        try {
            const snapshot = await this.db.collection('favorites')
                .where('userId', '==', this.currentUser.uid)
                .orderBy('addedAt', 'desc')
                .get();
            
            const favorites = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                favorites.push({
                    mal_id: data.animeId,
                    title: data.title,
                    title_english: data.titleEnglish,
                    images: {
                        jpg: {
                            large_image_url: data.image
                        }
                    },
                    type: data.type,
                    episodes: data.episodes,
                    score: data.score,
                    userRating: data.userRating,
                    userComment: data.userComment,
                    addedAt: data.addedAt?.toDate().toISOString() || new Date().toISOString()
                });
            });
            
            this._favoritesCache = favorites;
            this._favoritesCacheTime = now;
            
            return favorites;
        } catch (error) {
            console.error('Erreur lors de la récupération des favoris:', error);
            return [];
        }
    }

    // Obtenir le nombre de favoris
    async getFavoritesCount() {
        if (!this.isLoggedIn()) {
            return 0;
        }

        try {
            const favorites = await this.getFavorites();
            return favorites.length;
        } catch (error) {
            console.error('Erreur:', error);
            return 0;
        }
    }

    // Obtenir les statistiques communautaires d'un anime
    async getCommunityStats(animeId) {
        try {
            const statDoc = await this.db.collection('community_stats').doc(animeId.toString()).get();
            
            if (statDoc.exists) {
                return statDoc.data();
            }
            return null;
        } catch (error) {
            console.error('Erreur lors de la récupération des stats:', error);
            return null;
        }
    }

    // Obtenir les top animes de la communauté
    async getCommunityTopAnimes(limit = 10) {
        try {
            const snapshot = await this.db.collection('community_stats')
                .orderBy('count', 'desc')
                .limit(limit)
                .get();
            
            const topAnimes = [];
            snapshot.forEach(doc => {
                topAnimes.push({
                    animeId: doc.id,
                    ...doc.data()
                });
            });
            
            return topAnimes;
        } catch (error) {
            console.error('Erreur lors de la récupération du top communauté:', error);
            return [];
        }
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
    if (authBtn) {
        authBtn.addEventListener('click', async () => {
            if (authManager.isLoggedIn()) {
                if (confirm('Voulez-vous vous déconnecter ?')) {
                    await authManager.logout();
                    updateAuthButton();
                    updateFavoritesCount();
                    showNotification('Déconnecté avec succès', 'success');
                    // Rafraîchir l'affichage
                    if (typeof updateFavoriteButtons === 'function') {
                        updateFavoriteButtons();
                    }
                }
            } else {
                openModal(authModal);
            }
        });
    }

    // Switch entre login et register
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.remove('active');
            registerForm.classList.add('active');
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            registerForm.classList.remove('active');
            loginForm.classList.add('active');
        });
    }

    // Soumission formulaire de connexion
    if (loginFormElement) {
        loginFormElement.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            try {
                await authManager.login(email, password);
                closeModal(authModal);
                updateAuthButton();
                await updateFavoritesCount();
                showNotification(`Bienvenue ${authManager.getCurrentUser().username} !`, 'success');
                loginFormElement.reset();
                
                // Rafraîchir l'affichage
                if (typeof updateFavoriteButtons === 'function') {
                    updateFavoriteButtons();
                }
                if (typeof loadFavorites === 'function') {
                    loadFavorites();
                }
            } catch (error) {
                showNotification(error.message, 'error');
            }
        });
    }

    // Soumission formulaire d'inscription
    if (registerFormElement) {
        registerFormElement.addEventListener('submit', async (e) => {
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
                await authManager.register(username, email, password);
                closeModal(authModal);
                updateAuthButton();
                await updateFavoritesCount();
                showNotification(`Bienvenue ${username} ! Votre compte a été créé.`, 'success');
                registerFormElement.reset();
                registerForm.classList.remove('active');
                loginForm.classList.add('active');
            } catch (error) {
                showNotification(error.message, 'error');
            }
        });
    }

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
    if (!authBtn) return;
    
    if (authManager.isLoggedIn()) {
        const user = authManager.getCurrentUser();
        authBtn.textContent = `👤 ${user.username}`;
        authBtn.style.background = 'linear-gradient(135deg, #8B5CF6, #EC4899)';
    } else {
        authBtn.textContent = 'Se connecter';
        authBtn.style.background = '';
    }
}

// Mettre à jour le compteur de favoris
async function updateFavoritesCount() {
    if (!favCountElement) return;
    
    const count = await authManager.getFavoritesCount();
    favCountElement.textContent = count;
}

// Ouvrir une modale
function openModal(modal) {
    if (!modal) return;
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Fermer une modale
function closeModal(modal) {
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Afficher une notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
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

