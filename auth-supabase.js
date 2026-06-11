// ===== Gestion de l'authentification avec Supabase =====
// Même interface publique que l'ancien AuthManager Firebase :
// les autres scripts (app.js, anime.js, favorites-page.js, quick-rate.js, profile.js)
// fonctionnent sans modification.

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.client = window.supabaseClient;
        // Objet truthy même sans configuration pour que les pages
        // sortent de leur boucle d'attente et affichent "connexion requise".
        this.auth = this.client ? this.client.auth : {};
        this.authInitialized = false;

        // Charger depuis le cache localStorage immédiatement pour éviter le flash
        this.loadFromCache();

        if (!this.client) {
            this.authInitialized = true;
            this.currentUser = null;
            return;
        }

        // Session initiale + écoute des changements d'authentification
        this.client.auth.getSession().then(async ({ data: { session } }) => {
            if (session?.user) {
                await this.loadUserData(session.user);
                console.log('✅ Utilisateur connecté:', session.user.email);
            } else {
                this.currentUser = null;
                this.clearCache();
            }
            this.authInitialized = true;
            await this.refreshUI();
        });

        this.client.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                if (!this.currentUser || this.currentUser.uid !== session.user.id) {
                    await this.loadUserData(session.user);
                }
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this._favoritesCache = null;
                this.clearCache();
            }
            this.authInitialized = true;
            await this.refreshUI();
        });
    }

    // Rafraîchir l'interface (bouton + compteur)
    async refreshUI() {
        if (typeof updateAuthButton === 'function') {
            await updateAuthButton();
        }
        if (typeof updateFavoritesCount === 'function') {
            await updateFavoritesCount();
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
        } catch (error) {
            console.error('Erreur lors du nettoyage du cache:', error);
        }
    }

    // Charger le profil depuis la table "profiles"
    async loadUserData(supabaseUser) {
        try {
            const { data: profile } = await this.client
                .from('profiles')
                .select('username, profile_photo, created_at')
                .eq('id', supabaseUser.id)
                .maybeSingle();

            if (profile) {
                this.currentUser = {
                    uid: supabaseUser.id,
                    email: supabaseUser.email,
                    username: profile.username || supabaseUser.email.split('@')[0],
                    profilePhoto: profile.profile_photo || null,
                    favorites: [],
                    createdAt: profile.created_at || new Date().toISOString()
                };
            } else {
                // Créer le profil s'il n'existe pas (filet de sécurité si le trigger SQL manque)
                const username = supabaseUser.user_metadata?.username || supabaseUser.email.split('@')[0];
                await this.client.from('profiles').insert({
                    id: supabaseUser.id,
                    username: username
                });

                this.currentUser = {
                    uid: supabaseUser.id,
                    email: supabaseUser.email,
                    username: username,
                    profilePhoto: null,
                    favorites: [],
                    createdAt: new Date().toISOString()
                };
            }

            this.saveToCache();
        } catch (error) {
            console.error('Erreur lors du chargement des données utilisateur:', error);
        }
    }

    // Traduction des erreurs Supabase en français
    translateError(error) {
        const msg = (error?.message || '').toLowerCase();
        if (msg.includes('invalid login credentials')) return 'Email ou mot de passe incorrect';
        if (msg.includes('already registered')) return 'Cet email est déjà utilisé';
        if (msg.includes('password should be at least')) return 'Le mot de passe doit contenir au moins 6 caractères';
        if (msg.includes('email not confirmed')) return 'Confirmez votre email avant de vous connecter';
        if (msg.includes('invalid email') || msg.includes('validate email')) return 'Email invalide';
        if (msg.includes('rate limit')) return 'Trop de tentatives, réessayez dans quelques minutes';
        return error?.message || 'Une erreur est survenue';
    }

    // Inscription
    async register(username, email, password) {
        if (!this.client) throw new Error('Supabase non configuré (voir supabase-config.js)');
        try {
            const { data, error } = await this.client.auth.signUp({
                email: email,
                password: password,
                options: { data: { username: username } }
            });

            if (error) throw new Error(this.translateError(error));

            if (data.session && data.user) {
                // Connecté directement (confirmation email désactivée)
                await this.loadUserData(data.user);
                return this.currentUser;
            }

            // Confirmation email activée : pas de session tant que l'email n'est pas confirmé
            return null;
        } catch (error) {
            console.error('Erreur d\'inscription:', error);
            throw error;
        }
    }

    // Connexion
    async login(email, password) {
        if (!this.client) throw new Error('Supabase non configuré (voir supabase-config.js)');
        try {
            const { data, error } = await this.client.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw new Error(this.translateError(error));

            await this.loadUserData(data.user);
            return this.currentUser;
        } catch (error) {
            console.error('Erreur de connexion:', error);
            throw error;
        }
    }

    // Déconnexion
    async logout() {
        try {
            await this.client.auth.signOut();
            this.currentUser = null;
            this._favoritesCache = null;
        } catch (error) {
            console.error('Erreur de déconnexion:', error);
            throw new Error('Erreur lors de la déconnexion');
        }
    }

    // Vérifier si l'utilisateur est connecté
    isLoggedIn() {
        return this.currentUser !== null && this.authInitialized && !!this.client;
    }

    // Obtenir l'utilisateur actuel
    getCurrentUser() {
        return this.currentUser;
    }

    // ===== Profil =====

    async updateUsername(newUsername) {
        if (!this.isLoggedIn()) throw new Error('Vous devez être connecté');
        const { error } = await this.client
            .from('profiles')
            .update({ username: newUsername })
            .eq('id', this.currentUser.uid);
        if (error) throw new Error('Impossible de mettre à jour le pseudo');

        this.currentUser.username = newUsername;
        this.saveToCache();
    }

    // photo = data URL base64, ou null pour supprimer
    async updateProfilePhoto(photo) {
        if (!this.isLoggedIn()) throw new Error('Vous devez être connecté');
        const { error } = await this.client
            .from('profiles')
            .update({ profile_photo: photo })
            .eq('id', this.currentUser.uid);
        if (error) throw new Error('Impossible de mettre à jour la photo');

        this.currentUser.profilePhoto = photo;
        this.saveToCache();
    }

    async getProfilePhoto() {
        if (!this.isLoggedIn()) return null;
        try {
            const { data } = await this.client
                .from('profiles')
                .select('profile_photo')
                .eq('id', this.currentUser.uid)
                .maybeSingle();
            return data?.profile_photo || null;
        } catch (error) {
            console.error('Erreur lors du chargement de la photo:', error);
            return null;
        }
    }

    // ===== Favoris =====

    // Ajouter un anime aux favoris
    async addFavorite(anime, rating = 0, comment = '') {
        if (!this.isLoggedIn()) {
            throw new Error('Vous devez être connecté pour ajouter des favoris');
        }

        try {
            const { error } = await this.client.from('favorites').upsert({
                user_id: this.currentUser.uid,
                anime_id: anime.mal_id,
                title: anime.title,
                title_english: anime.title_english || '',
                image: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '',
                type: anime.type || 'TV',
                episodes: anime.episodes || null,
                score: anime.score || null,
                user_rating: rating,
                user_comment: comment
            });

            if (error) throw error;

            // Les statistiques communautaires sont mises à jour par un trigger SQL
            this._favoritesCache = null;
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'ajout aux favoris:', error);
            throw new Error('Impossible d\'ajouter aux favoris');
        }
    }

    // Mettre à jour un favori
    async updateFavorite(animeId, rating, comment) {
        if (!this.isLoggedIn()) {
            throw new Error('Vous devez être connecté');
        }

        try {
            const { error } = await this.client
                .from('favorites')
                .update({ user_rating: rating, user_comment: comment })
                .eq('user_id', this.currentUser.uid)
                .eq('anime_id', animeId);

            if (error) throw error;

            this._favoritesCache = null;
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
            const { error } = await this.client
                .from('favorites')
                .delete()
                .eq('user_id', this.currentUser.uid)
                .eq('anime_id', animeId);

            if (error) throw error;

            this._favoritesCache = null;
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
            const favorites = await this.getFavorites();
            return favorites.some(fav => fav.mal_id === animeId);
        } catch (error) {
            console.error('Erreur lors de la vérification:', error);
            return false;
        }
    }

    // Obtenir tous les favoris (avec cache local 30 s)
    _favoritesCache = null;
    _favoritesCacheTime = null;

    async getFavorites(forceRefresh = false) {
        if (!this.isLoggedIn()) {
            return [];
        }

        const now = Date.now();
        if (!forceRefresh && this._favoritesCache && this._favoritesCacheTime && (now - this._favoritesCacheTime < 30000)) {
            return this._favoritesCache;
        }

        try {
            const { data, error } = await this.client
                .from('favorites')
                .select('*')
                .eq('user_id', this.currentUser.uid)
                .order('added_at', { ascending: false });

            if (error) throw error;

            // Même forme d'objet que l'ancienne version Firebase
            const favorites = (data || []).map(row => ({
                mal_id: row.anime_id,
                title: row.title,
                title_english: row.title_english,
                images: {
                    jpg: {
                        large_image_url: row.image
                    }
                },
                type: row.type,
                episodes: row.episodes,
                score: row.score,
                userRating: row.user_rating,
                userComment: row.user_comment,
                addedAt: row.added_at
            }));

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

    // ===== Statistiques communautaires (lecture seule, écrites par trigger SQL) =====

    async getCommunityStats(animeId) {
        try {
            const { data } = await this.client
                .from('community_stats')
                .select('*')
                .eq('anime_id', animeId)
                .maybeSingle();
            if (!data) return null;
            return {
                count: data.count,
                totalRating: data.total_rating,
                averageRating: data.average_rating,
                lastUpdated: data.last_updated
            };
        } catch (error) {
            console.error('Erreur lors de la récupération des stats:', error);
            return null;
        }
    }

    async getCommunityTopAnimes(limit = 10) {
        try {
            const { data } = await this.client
                .from('community_stats')
                .select('*')
                .order('count', { ascending: false })
                .limit(limit);

            return (data || []).map(row => ({
                animeId: String(row.anime_id),
                count: row.count,
                totalRating: row.total_rating,
                averageRating: row.average_rating
            }));
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

// Onglets de switch
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
                const user = await authManager.register(username, email, password);
                closeModal(authModal);
                registerFormElement.reset();

                if (user) {
                    // Connecté directement
                    await updateAuthButton();
                    await updateFavoritesCount();
                    showNotification(`Bienvenue ${username} ! Votre compte a été créé.`, 'success');
                } else {
                    // Confirmation par email requise
                    showNotification('Compte créé ! Vérifiez votre boîte mail pour confirmer votre inscription.', 'info');
                }

                registerForm.classList.remove('active');
                loginForm.classList.add('active');
                if (showLoginLink) showLoginLink.classList.add('active');
                if (showRegisterLink) showRegisterLink.classList.remove('active');
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
        return;
    }

    if (authManager.isLoggedIn()) {
        const user = authManager.getCurrentUser();

        // Afficher immédiatement depuis le cache si disponible
        const cachedPhoto = user.profilePhoto;

        authBtn.classList.add('nav-user');
        authBtn.innerHTML = authBtnUserMarkup(user);

        // Vérifier la photo en arrière-plan pour mettre à jour si nécessaire
        try {
            const profilePhoto = await authManager.getProfilePhoto();

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
