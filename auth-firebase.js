// ===== Gestion de l'authentification avec Firebase =====

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.auth = window.firebaseAuth;
        this.db = window.firebaseDB;
        this.authInitialized = false;
        
        // Charger depuis le cache localStorage immédiatement pour éviter le flash
        this.loadFromCache();
        
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
                    this.clearCache();
                    console.log('ℹ️ Utilisateur déconnecté');
                }
                
                // Marquer l'auth comme initialisée
                this.authInitialized = true;
                
                // Mettre à jour l'interface
                if (typeof updateAuthButton === 'function') {
                    await updateAuthButton();
                }
                if (typeof updateFavoritesCount === 'function') {
                    await updateFavoritesCount();
                }
            });
        }
    }
    
    // Charger les données depuis localStorage (cache)
    loadFromCache() {
        try {
            const cachedUser = localStorage.getItem('cachedUser');
            if (cachedUser) {
                this.currentUser = JSON.parse(cachedUser);
                console.log('📦 Utilisateur chargé depuis le cache');
            }
        } catch (error) {
            console.error('Erreur lors du chargement du cache:', error);
        }
    }
    
    // Sauvegarder dans le cache
    saveToCache() {
        try {
            if (this.currentUser) {
                localStorage.setItem('cachedUser', JSON.stringify(this.currentUser));
                console.log('💾 Utilisateur sauvegardé dans le cache');
            }
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du cache:', error);
        }
    }
    
    // Nettoyer le cache
    clearCache() {
        try {
            localStorage.removeItem('cachedUser');
            localStorage.removeItem('favoritesCount');
            console.log('🗑️ Cache utilisateur nettoyé');
        } catch (error) {
            console.error('Erreur lors du nettoyage du cache:', error);
        }
    }

    // Charger les données utilisateur depuis Firestore
    async loadUserData(firebaseUser) {
        try {
            const userDoc = await this.db.collection('users').doc(firebaseUser.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                this.currentUser = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    username: userData.username || firebaseUser.email.split('@')[0],
                    profilePhoto: userData.profilePhoto || userData.photoURL || null,
                    favorites: [],
                    createdAt: userData.createdAt || new Date().toISOString()
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
                    profilePhoto: null,
                    favorites: [],
                    createdAt: new Date().toISOString()
                };
            }
            
            // Sauvegarder dans le cache pour le prochain chargement
            this.saveToCache();
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
        console.log('🔍 getFavorites() appelée, forceRefresh:', forceRefresh);
        if (!this.isLoggedIn()) {
            console.log('❌ Utilisateur non connecté');
            return [];
        }

        console.log('👤 Utilisateur connecté, UID:', this.currentUser.uid);

        // Cache de 30 secondes
        const now = Date.now();
        if (!forceRefresh && this._favoritesCache && this._favoritesCacheTime && (now - this._favoritesCacheTime < 30000)) {
            console.log('📦 Retour du cache:', this._favoritesCache.length, 'favoris');
            return this._favoritesCache;
        }

        try {
            console.log('🔍 Requête Firestore pour userId:', this.currentUser.uid);
            // Requête sans tri pour éviter l'erreur d'index en construction
            const snapshot = await this.db.collection('favorites')
                .where('userId', '==', this.currentUser.uid)
                .get();
            
            console.log('📊 Snapshot reçu, taille:', snapshot.size);
            
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
            
            // Trier manuellement par date (du plus récent au plus ancien)
            favorites.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
            
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
async function initAuthUI() {
    await updateAuthButton();
    await updateFavoritesCount();

    // Événements des boutons
    if (authBtn) {
        authBtn.addEventListener('click', async () => {
            if (authManager.isLoggedIn()) {
                // Rediriger vers la page profil
                window.location.href = 'profile.html';
            } else {
                openModal(authModal);
            }
        });
    }

    // Switch entre login et register (onglets 01 / 02)
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.remove('active');
            registerForm.classList.add('active');
            showRegisterLink.classList.add('active');
            if (showLoginLink) showLoginLink.classList.remove('active');
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            registerForm.classList.remove('active');
            loginForm.classList.add('active');
            showLoginLink.classList.add('active');
            if (showRegisterLink) showRegisterLink.classList.remove('active');
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
                await updateAuthButton();
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
                await updateAuthButton();
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

// Markup du bouton utilisateur (avatar + pseudo, style éditorial)
function authBtnUserMarkup(user) {
    if (user.profilePhoto) {
        return `<img src="${user.profilePhoto}" alt="${user.username}" class="nav-profile-photo"><span class="nav-user-pseudo">${user.username}</span>`;
    }
    const initials = user.username.substring(0, 2).toUpperCase();
    return `<span class="user-avatar small">${initials}</span><span class="nav-user-pseudo">${user.username}</span>`;
}

// Mettre à jour le bouton d'authentification
async function updateAuthButton() {
    if (!authBtn) {
        console.log('❌ authBtn introuvable');
        return;
    }

    if (authManager.isLoggedIn()) {
        const user = authManager.getCurrentUser();
        console.log('🔄 Mise à jour du bouton auth pour:', user.username);

        // Afficher immédiatement depuis le cache si disponible
        const cachedPhoto = user.profilePhoto;

        authBtn.classList.add('nav-user');
        authBtn.innerHTML = authBtnUserMarkup(user);

        // Vérifier Firestore en arrière-plan pour mettre à jour si nécessaire
        try {
            const userDoc = await authManager.db.collection('users').doc(user.uid).get();
            const userData = userDoc.data();
            const profilePhoto = userData?.profilePhoto || userData?.photoURL;

            // Mettre à jour si la photo a changé
            if (profilePhoto !== cachedPhoto) {
                user.profilePhoto = profilePhoto;
                authManager.saveToCache();
                authBtn.innerHTML = authBtnUserMarkup(user);
            }
        } catch (error) {
            console.error('❌ Erreur lors de la récupération de la photo de profil:', error);
        }
    } else {
        authBtn.classList.remove('nav-user');
        authBtn.innerHTML = '<span class="nav-user-pseudo">Se connecter</span>';
    }
}

// Mettre à jour le compteur de favoris
function renderFavCount(count) {
    const n = Number(count) || 0;
    if (favCountElement) {
        favCountElement.textContent = n;
        favCountElement.style.display = n > 0 ? '' : 'none';
    }
    // Compteur éditorial du hero (index)
    const counterFavs = document.getElementById('counterFavs');
    if (counterFavs) {
        counterFavs.textContent = n.toLocaleString('fr-FR');
    }
}

async function updateFavoritesCount() {
    // Charger immédiatement depuis le cache
    const cachedCount = localStorage.getItem('favoritesCount');
    if (cachedCount !== null) {
        renderFavCount(cachedCount);
    }

    // Mettre à jour en arrière-plan
    const count = await authManager.getFavoritesCount();
    renderFavCount(count);
    localStorage.setItem('favoritesCount', count);
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
        top: 90px;
        right: 20px;
        padding: 14px 20px;
        border-radius: 0;
        background: #0a0a0a;
        color: #f5f1e8;
        border: 1px solid rgba(245, 241, 232, 0.4);
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        z-index: 3000;
        animation: slideInRight 0.4s ease;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        max-width: 400px;
    `;

    switch(type) {
        case 'success':
            notification.style.borderLeft = '3px solid #FFD60A';
            break;
        case 'error':
            notification.style.borderLeft = '3px solid #E63946';
            notification.style.color = '#E63946';
            break;
        case 'info':
            notification.style.borderLeft = '3px solid rgba(245, 241, 232, 0.6)';
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

