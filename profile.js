// Script pour la page de profil

// Éléments DOM
const profileContainer = document.getElementById('profileContainer');
const loginRequired = document.getElementById('loginRequired');
const editProfileModal = document.getElementById('editProfileModal');

// Initialiser la page - VERSION SIMPLIFIÉE
async function initProfilePage() {
    console.log('🚀 initProfilePage() appelée');
    
    // Attendre que Firebase Auth soit prêt
    if (!authManager.auth) {
        setTimeout(initProfilePage, 100);
        return;
    }
    
    // Attendre jusqu'à 5 secondes que l'utilisateur soit chargé
    let attempts = 0;
    const maxAttempts = 50;
    
    const checkUser = async () => {
        attempts++;
        
        if (authManager.isLoggedIn()) {
            console.log('✅ Utilisateur connecté, affichage du profil');
            await displayProfile();
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
    profileContainer.style.display = 'none';
}

// Afficher le profil
async function displayProfile() {
    const user = authManager.getCurrentUser();
    if (!user) {
        showLoginRequired();
        return;
    }
    
    profileContainer.style.display = 'block';
    loginRequired.style.display = 'none';
    
    // Afficher les informations utilisateur
    document.getElementById('displayUsername').textContent = user.username || 'Utilisateur';
    document.getElementById('displayEmail').textContent = user.email || '';
    
    // Initiales pour l'avatar
    const initials = (user.username || user.email || '?')
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    document.getElementById('userInitials').textContent = initials;
    
    // Charger la photo de profil si elle existe
    await loadProfilePhoto(user.uid);
    
    // Date de création du compte
    if (user.createdAt) {
        const date = new Date(user.createdAt);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('memberSince').textContent = date.toLocaleDateString('fr-FR', options);
    }
    
    // Charger les statistiques
    await loadStats();
    
    // Charger les derniers favoris
    await loadRecentFavorites();
}

// Charger les statistiques
async function loadStats() {
    const favorites = await authManager.getFavorites();
    
    // Nombre de favoris
    document.getElementById('statFavorites').textContent = favorites.length;
    
    if (favorites.length === 0) {
        document.getElementById('statAvgRating').textContent = '0.0';
        document.getElementById('statComments').textContent = '0';
        document.getElementById('statBestRated').textContent = '-';
        return;
    }
    
    // Note moyenne
    const totalRating = favorites.reduce((sum, fav) => sum + (fav.userRating || 0), 0);
    const avgRating = (totalRating / favorites.length).toFixed(1);
    document.getElementById('statAvgRating').textContent = avgRating;
    
    // Nombre de commentaires
    const commentsCount = favorites.filter(fav => fav.userComment && fav.userComment.trim() !== '').length;
    document.getElementById('statComments').textContent = commentsCount;
    
    // Meilleur anime (le mieux noté)
    const bestRated = favorites.reduce((best, fav) => {
        return (fav.userRating || 0) > (best.userRating || 0) ? fav : best;
    }, favorites[0]);
    
    const bestTitle = bestRated.title || bestRated.title_english || 'Aucun';
    const statBestRated = document.getElementById('statBestRated');
    statBestRated.textContent = bestTitle.length > 20 
        ? bestTitle.substring(0, 20) + '...' 
        : bestTitle;
    
    // Mettre le meilleur anime en avant (accent éditorial)
    if (bestTitle !== 'Aucun' && bestTitle !== '-') {
        statBestRated.style.color = 'var(--accent)';
    }
}

// Fonction pour générer les étoiles (sans demi-étoiles)
function generateStars(rating) {
    if (!rating || rating === 0) return '';

    const fullStars = Math.floor(rating);
    return '★'.repeat(fullStars);
}

// Charger les derniers favoris
async function loadRecentFavorites() {
    const favorites = await authManager.getFavorites();
    const recentList = document.getElementById('recentFavoritesList');
    
    if (favorites.length === 0) {
        recentList.innerHTML = '<p style="color: var(--text-dim); text-align: center; padding: 24px 0;">Aucun favori pour le moment</p>';
        return;
    }
    
    // Prendre les 5 derniers favoris
    const recentFavorites = favorites.slice(0, 5);
    
    recentList.innerHTML = recentFavorites.map(fav => {
        const imageUrl = fav.images?.jpg?.large_image_url || fav.images?.jpg?.image_url || 'https://via.placeholder.com/60x85?text=No+Image';
        const title = fav.title || 'Sans titre';
        const stars = generateStars(fav.userRating || 0);
        
        return `
            <div class="recent-item">
                <img src="${imageUrl}" alt="${title}" onerror="this.src='https://via.placeholder.com/60x85?text=No+Image'">
                <div class="recent-item-info">
                    <div class="recent-item-title">${title}</div>
                    <div class="recent-item-meta">${fav.type || 'TV'} • ${fav.episodes || '?'} épisodes</div>
                </div>
                <div class="recent-item-rating">${stars}</div>
            </div>
        `;
    }).join('');
}

// Ouvrir la modale d'édition
async function openEditModal() {
    const user = authManager.getCurrentUser();
    document.getElementById('newUsername').value = user.username || '';
    
    // Copier la photo actuelle dans la modal
    const profilePhoto = document.getElementById('profilePhoto');
    const editProfilePhoto = document.getElementById('editProfilePhoto');
    const userInitials = document.getElementById('userInitials');
    const editUserInitials = document.getElementById('editUserInitials');
    const deletePhotoBtn = document.getElementById('deletePhotoBtn');
    
    if (profilePhoto.src && profilePhoto.style.display === 'block') {
        editProfilePhoto.src = profilePhoto.src;
        editProfilePhoto.style.display = 'block';
        editUserInitials.style.display = 'none';
        deletePhotoBtn.style.display = 'inline-block'; // Afficher le bouton supprimer
    } else {
        editProfilePhoto.style.display = 'none';
        editUserInitials.style.display = 'block';
        deletePhotoBtn.style.display = 'none'; // Cacher le bouton supprimer
    }
    
    editUserInitials.textContent = userInitials.textContent;
    
    openModal(editProfileModal);
}

// Gérer la soumission du formulaire d'édition
document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newUsername = document.getElementById('newUsername').value.trim();
    
    if (!newUsername) {
        showNotification('Le nom d\'utilisateur ne peut pas être vide', 'error');
        return;
    }
    
    try {
        // Mettre à jour dans Firestore
        const user = authManager.getCurrentUser();
        await authManager.db.collection('users').doc(user.uid).update({
            username: newUsername
        });
        
        // Mettre à jour localement
        authManager.currentUser.username = newUsername;
        
        // Rafraîchir l'affichage
        await displayProfile();
        
        closeModal(editProfileModal);
        showNotification('Profil mis à jour avec succès !', 'success');
        
        // Rafraîchir le nom dans la navbar
        if (typeof updateAuthButton === 'function') {
            updateAuthButton();
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        showNotification('Erreur lors de la mise à jour du profil', 'error');
    }
});

// Se déconnecter
async function logoutUser() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        await authManager.logout();
        showNotification('Déconnecté avec succès', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
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

// Variables globales pour le crop - Style Discord
let cropImage = null;
let cropCanvas = null;
let cropCtx = null;
let originalImageData = null;
let currentZoom = 1.0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let imageX = 0;
let imageY = 0;
let imageWidth = 0;
let imageHeight = 0;

// Upload de photo de profil - Ouvre la modal de crop
async function uploadProfilePhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
        showNotification('Veuillez sélectionner une image valide', 'error');
        return;
    }
    
    // Vérifier la taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        showNotification('L\'image ne doit pas dépasser 2 MB', 'error');
        return;
    }
    
    // Charger l'image pour le crop
    const reader = new FileReader();
    reader.onload = function(e) {
        openCropModal(e.target.result);
    };
    reader.readAsDataURL(file);
}

// Ouvrir la modal de crop
function openCropModal(imageSrc) {
    const modal = document.getElementById('cropPhotoModal');
    cropCanvas = document.getElementById('cropCanvas');
    cropCtx = cropCanvas.getContext('2d');
    
    // Charger l'image
    cropImage = new Image();
    cropImage.onload = function() {
        initCropCanvas();
        setupCropControls();
    };
    cropImage.src = imageSrc;
    
    openModal(modal);
}

// Initialiser le canvas de crop
function initCropCanvas() {
    const container = document.querySelector('.crop-container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculer les dimensions pour fit l'image dans le container
    const scale = Math.min(containerWidth / cropImage.width, containerHeight / cropImage.height);
    imageWidth = cropImage.width * scale;
    imageHeight = cropImage.height * scale;
    
    // Configurer le canvas
    cropCanvas.width = containerWidth;
    cropCanvas.height = containerHeight;
    
    // Centrer l'image
    imageX = (containerWidth - imageWidth) / 2;
    imageY = (containerHeight - imageHeight) / 2;
    
    // Sauvegarder l'état initial
    originalImageData = {
        x: imageX,
        y: imageY,
        width: imageWidth,
        height: imageHeight
    };
    
    currentZoom = 1.0;
    document.getElementById('zoomSlider').value = 100;
    
    drawCropCanvas();
}

// Dessiner le canvas
function drawCropCanvas() {
    cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
    
    // Dessiner l'image avec zoom
    const zoomedWidth = imageWidth * currentZoom;
    const zoomedHeight = imageHeight * currentZoom;
    
    cropCtx.drawImage(
        cropImage,
        imageX, imageY,
        zoomedWidth, zoomedHeight
    );
}

// Configurer les contrôles
function setupCropControls() {
    // Zoom slider
    const zoomSlider = document.getElementById('zoomSlider');
    zoomSlider.oninput = function() {
        currentZoom = this.value / 100;
        drawCropCanvas();
    };
    
    // Drag sur le canvas
    cropCanvas.onmousedown = startDrag;
    cropCanvas.ontouchstart = startDrag;
    
    document.onmousemove = drag;
    document.ontouchmove = drag;
    
    document.onmouseup = stopDrag;
    document.ontouchend = stopDrag;
}

function startDrag(e) {
    isDragging = true;
    const rect = cropCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    dragStartX = clientX - rect.left - imageX;
    dragStartY = clientY - rect.top - imageY;
}

function drag(e) {
    if (!isDragging) return;
    e.preventDefault();
    
    const rect = cropCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    imageX = clientX - rect.left - dragStartX;
    imageY = clientY - rect.top - dragStartY;
    
    drawCropCanvas();
}

function stopDrag() {
    isDragging = false;
}

// Réinitialiser le crop
function resetCrop() {
    if (!originalImageData) return;
    
    imageX = originalImageData.x;
    imageY = originalImageData.y;
    imageWidth = originalImageData.width;
    imageHeight = originalImageData.height;
    currentZoom = 1.0;
    document.getElementById('zoomSlider').value = 100;
    
    drawCropCanvas();
}

// Annuler le crop
function cancelCrop() {
    closeModal(document.getElementById('cropPhotoModal'));
    document.getElementById('photoUpload').value = '';
}

// Confirmer le crop et sauvegarder
async function confirmCrop() {
    try {
        const user = authManager.getCurrentUser();
        if (!user) return;
        
        showNotification('Sauvegarde en cours...', 'info');
        
        // Créer un canvas pour extraire le cercle au centre
        const outputCanvas = document.createElement('canvas');
        const outputSize = 200;
        outputCanvas.width = outputSize;
        outputCanvas.height = outputSize;
        const outputCtx = outputCanvas.getContext('2d');
        
        // Coordonnées du cercle au centre du canvas principal
        const centerX = cropCanvas.width / 2;
        const centerY = cropCanvas.height / 2;
        const radius = 100; // 200px / 2
        
        // Calculer les coordonnées source pour extraire le cercle
        const zoomedWidth = imageWidth * currentZoom;
        const zoomedHeight = imageHeight * currentZoom;
        
        // Ratio entre le canvas et l'image originale
        const scaleX = cropImage.width / zoomedWidth;
        const scaleY = cropImage.height / zoomedHeight;
        
        // Position source dans l'image originale
        const sourceX = (centerX - imageX - radius) * scaleX;
        const sourceY = (centerY - imageY - radius) * scaleY;
        const sourceSize = (radius * 2) * scaleX;
        
        // Créer un cercle clippé
        outputCtx.beginPath();
        outputCtx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
        outputCtx.closePath();
        outputCtx.clip();
        
        // Dessiner la portion de l'image
        outputCtx.drawImage(
            cropImage,
            sourceX, sourceY, sourceSize, sourceSize,
            0, 0, outputSize, outputSize
        );
        
        // Convertir en base64
        const croppedImage = outputCanvas.toDataURL('image/jpeg', 0.85);
        
        // Mettre à jour dans Firestore
        await authManager.db.collection('users').doc(user.uid).update({
            profilePhoto: croppedImage
        });
        
        // Afficher la nouvelle photo sur le profil et dans la modal d'édition
        const profilePhoto = document.getElementById('profilePhoto');
        const editProfilePhoto = document.getElementById('editProfilePhoto');
        const userInitials = document.getElementById('userInitials');
        const editUserInitials = document.getElementById('editUserInitials');
        const deletePhotoBtn = document.getElementById('deletePhotoBtn');
        
        profilePhoto.src = croppedImage;
        profilePhoto.style.display = 'block';
        userInitials.style.display = 'none';
        
        editProfilePhoto.src = croppedImage;
        editProfilePhoto.style.display = 'block';
        editUserInitials.style.display = 'none';
        deletePhotoBtn.style.display = 'inline-block'; // Afficher le bouton supprimer
        
        // Mettre à jour la navbar
        if (typeof updateAuthButton === 'function') {
            await updateAuthButton();
        }
        
        // Fermer la modal de crop
        closeModal(document.getElementById('cropPhotoModal'));
        showNotification('Photo de profil mise à jour !', 'success');
        
        // Reset input
        document.getElementById('photoUpload').value = '';
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        showNotification('Erreur lors de la sauvegarde de la photo', 'error');
    }
}

// Supprimer la photo de profil
async function deleteProfilePhoto() {
    if (!confirm('Êtes-vous sûr de vouloir supprimer votre photo de profil ?')) {
        return;
    }
    
    try {
        const user = authManager.getCurrentUser();
        if (!user) return;
        
        // Supprimer la photo de Firestore
        await authManager.db.collection('users').doc(user.uid).update({
            profilePhoto: firebase.firestore.FieldValue.delete()
        });
        
        // Réinitialiser l'affichage - afficher les initiales
        const profilePhoto = document.getElementById('profilePhoto');
        const editProfilePhoto = document.getElementById('editProfilePhoto');
        const userInitials = document.getElementById('userInitials');
        const editUserInitials = document.getElementById('editUserInitials');
        const deletePhotoBtn = document.getElementById('deletePhotoBtn');
        
        profilePhoto.style.display = 'none';
        profilePhoto.src = '';
        userInitials.style.display = 'flex';
        
        editProfilePhoto.style.display = 'none';
        editProfilePhoto.src = '';
        editUserInitials.style.display = 'flex';
        deletePhotoBtn.style.display = 'none';
        
        // Mettre à jour la navbar
        if (typeof updateAuthButton === 'function') {
            await updateAuthButton();
        }
        
        showNotification('Photo de profil supprimée', 'success');
    } catch (error) {
        console.error('Erreur lors de la suppression de la photo:', error);
        showNotification('Erreur lors de la suppression de la photo', 'error');
    }
}

// Charger la photo de profil
async function loadProfilePhoto(userId) {
    try {
        const userDoc = await authManager.db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        
        if (userData && userData.profilePhoto) {
            const profilePhoto = document.getElementById('profilePhoto');
            const userInitials = document.getElementById('userInitials');
            
            profilePhoto.src = userData.profilePhoto;
            profilePhoto.style.display = 'block';
            userInitials.style.display = 'none';
        }
    } catch (error) {
        console.error('Erreur lors du chargement de la photo:', error);
    }
}

// Initialiser la page au chargement
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfilePage);
} else {
    initProfilePage();
}

