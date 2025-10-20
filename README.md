# 🎌 AnimeHub - Application Web d'Animes

Une application web moderne et élégante pour explorer des milliers d'animes avec un système complet d'authentification et de favoris.

![Violet & Rose Theme](https://img.shields.io/badge/Theme-Violet%20%26%20Rose-blueviolet)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-yellow)
![API](https://img.shields.io/badge/API-Jikan-blue)

## ✨ Fonctionnalités

### 🎨 Design Moderne
- **Thème violet/rose** avec dégradés élégants (#8B5CF6 → #EC4899)
- **Animations fluides** et effets de hover sophistiqués
- **Interface responsive** adaptée à tous les écrans
- **Typographie moderne** et lisible

### 📺 Gestion des Animes
- **20 animes par page** avec pagination intuitive
- **Navigation fluide** entre les pages
- **Cartes animées** avec effets de survol
- **Détails complets** pour chaque anime (synopsis, score, studios, etc.)
- **Bandes-annonces** intégrées

### 🔐 Authentification
- **Inscription** avec validation des données
- **Connexion** sécurisée
- **Session persistante** (localStorage)
- **Gestion de profil** utilisateur

### ⚡ Notation Rapide (Style Tinder)
- **Interface swipe** pour découvrir rapidement des animes
- **Deux actions** : Skip (👎) ou Like (❤️)
- **Skip** : Ignorer un anime non vu
- **Like** : Ouvre la modale de notation complète
- **Support clavier** : ← pour skip, → pour like
- **Compteurs** : Statistiques en temps réel
- **Sessions** de 20 animes aléatoires

### ❤️ Système de Favoris Avancé
- **Page dédiée** aux favoris (pas juste une popup)
- **Notation** de 0.5 à 5 étoiles (demi-étoiles incluses)
- **Commentaires** personnalisés sur chaque anime
- **Modification** de vos notes et commentaires
- **Persistance** des favoris par utilisateur
- **Compteur** en temps réel
- **Date d'ajout** pour chaque favori

### 🔍 Recherche
- **Recherche en temps réel** d'animes
- **Résultats paginés**
- **Effacement automatique** pour revenir aux top animes

## 🚀 Installation

### Prérequis
- Un navigateur web moderne (Chrome, Firefox, Edge, Safari)
- Un serveur web local (optionnel mais recommandé)

### Méthode 1 : Utilisation directe
```bash
# Cloner ou télécharger le projet
cd anime-hub

# Ouvrir index.html dans votre navigateur
# Ou utiliser un serveur local
```

### Méthode 2 : Serveur local avec Python
```bash
# Python 3
python -m http.server 8000

# Ouvrir http://localhost:8000 dans votre navigateur
```

### Méthode 3 : Live Server (VS Code)
```bash
# Installer l'extension "Live Server" dans VS Code
# Clic droit sur index.html -> "Open with Live Server"
```

## 📁 Structure du Projet

```
anime-hub/
│
├── index.html           # Page d'accueil avec liste d'animes
├── favorites.html       # Page dédiée aux favoris
├── quick-rate.html      # Page de notation rapide (Tinder style)
├── styles.css          # Styles principaux et animations
├── favorites.css       # Styles spécifiques aux favoris
├── quick-rate.css      # Styles pour la notation rapide
├── app.js              # Logique principale et API Jikan
├── auth.js             # Authentification et gestion favoris
├── favorites-page.js   # Logique de la page favoris
├── quick-rate.js       # Logique de notation rapide
└── README.md           # Documentation
```

## 🚀 Démarrage Rapide

1. **Ouvrez `index.html`** dans votre navigateur (ou utilisez un serveur local)
2. **Créez un compte** : Cliquez sur "Se connecter" → "S'inscrire"
   - Ex: test@test.com / 123456
3. **Mode Notation Rapide ⚡** :
   - Cliquez sur "⚡ Notation Rapide" 
   - Skip (👎) ou Like (❤️) les animes style Tinder
   - Utilisez les flèches ← → du clavier
4. **Ajoutez des favoris** avec notes et commentaires
5. **Consultez vos favoris** sur la page dédiée

## 🎯 Utilisation

### Navigation de Base

1. **Page d'accueil** : Affiche les 20 meilleurs animes
2. **Pagination** : Utilisez les boutons ou numéros de page
3. **Détails** : Cliquez sur une carte pour voir les détails complets
4. **Notation Rapide** : Mode découverte style Tinder
5. **Favoris** : Page dédiée à vos animes préférés

### Authentification

#### S'inscrire
1. Cliquez sur **"Se connecter"** dans la navbar
2. Cliquez sur **"S'inscrire"**
3. Remplissez le formulaire :
   - Nom d'utilisateur
   - Email
   - Mot de passe (min. 6 caractères)
   - Confirmation du mot de passe
4. Cliquez sur **"S'inscrire"**

#### Se connecter
1. Cliquez sur **"Se connecter"**
2. Entrez votre email et mot de passe
3. Cliquez sur **"Se connecter"**

#### Se déconnecter
1. Cliquez sur votre nom d'utilisateur
2. Confirmez la déconnexion

### Gestion des Favoris

#### Ajouter un anime aux favoris
1. Cliquez sur une carte d'anime pour voir ses détails
2. Cliquez sur **"🤍 Ajouter aux favoris"**
3. Une modale s'ouvre vous demandant :
   - **Votre note** : de 0.5 à 5 étoiles (incluant les demi-étoiles)
   - **Votre commentaire** : optionnel, partagez votre avis
4. Cliquez sur **"❤️ Ajouter à mes favoris"**

#### Voir vos favoris
- Cliquez sur **"❤️ Favoris"** dans la navbar
- Vous accédez à la **page dédiée des favoris**
- Chaque favori affiche :
  - Image et informations de l'anime
  - Votre note avec étoiles dorées
  - Votre commentaire
  - Date d'ajout

#### Modifier un favori
1. Sur la page des favoris, cliquez sur **"✏️ Modifier"**
2. Modifiez votre note et/ou commentaire
3. Cliquez sur **"💾 Enregistrer les modifications"**

#### Retirer un anime des favoris
- Cliquez sur **"🗑️ Retirer"** sur la page des favoris
- Confirmez la suppression

### Recherche

1. Utilisez la **barre de recherche** dans la navbar
2. Tapez le nom d'un anime
3. Appuyez sur **Entrée** ou cliquez sur **🔍**
4. Les résultats s'affichent avec pagination
5. Effacez le champ de recherche pour revenir aux top animes

### Notation Rapide

1. Cliquez sur **"⚡ Notation Rapide"** dans la navbar
2. Des animes aléatoires s'affichent un par un
3. Pour chaque anime :
   - **👎 Pas vu** : Ignorez l'anime (flèche gauche ←)
   - **❤️ J'aime** : Ouvre la modale de notation (flèche droite →)
4. Si vous aimez, notez l'anime et ajoutez un commentaire
5. L'anime passe automatiquement au suivant
6. Statistiques en temps réel :
   - Nombre d'animes ignorés
   - Nombre d'animes notés
   - Total traité
7. À la fin de la session (20 animes), vous pouvez recommencer

## 🔌 API Utilisée

### Jikan API v4
- **URL** : https://api.jikan.moe/v4
- **Documentation** : https://docs.api.jikan.moe/
- **Type** : API REST publique et gratuite
- **Source** : MyAnimeList (unofficial)

### Endpoints Utilisés

```javascript
// Top animes
GET /top/anime?page={page}&limit=20

// Recherche
GET /anime?q={query}&page={page}&limit=20&order_by=popularity

// Détails
GET /anime/{id}/full
```

### Limite de Rate
- **3 requêtes par seconde**
- **60 requêtes par minute**

## 💾 Stockage des Données

### LocalStorage
L'application utilise le localStorage du navigateur pour :

```javascript
{
  // Utilisateurs enregistrés
  "users": [
    {
      "username": "John",
      "email": "john@example.com",
      "password": "******",
      "favorites": [...],
      "createdAt": "2025-10-20T..."
    }
  ],
  
  // Utilisateur actuellement connecté
  "currentUser": {
    "username": "John",
    "email": "john@example.com",
    "favorites": [...]
  }
}
```

### Sécurité
⚠️ **Note** : Cette application est conçue à des fins de démonstration.
- Les mots de passe sont stockés en clair (non recommandé en production)
- Pour une application réelle, utilisez :
  - Un backend sécurisé
  - Hashage des mots de passe (bcrypt, argon2)
  - Tokens d'authentification (JWT)
  - HTTPS

## 🎨 Palette de Couleurs

```css
Violet principal : #8B5CF6
Rose principal   : #EC4899
Fond sombre      : #0F172A
Carte            : #1E293B
Texte primaire   : #F1F5F9
Texte secondaire : #94A3B8
Dégradé          : linear-gradient(135deg, #8B5CF6, #EC4899)
```

## 📱 Responsive Design

L'application s'adapte automatiquement :
- **Desktop** : Grille 4-5 colonnes
- **Tablette** : Grille 2-3 colonnes
- **Mobile** : Grille 1-2 colonnes

## ⚡ Performances

### Optimisations
- Chargement différé des images
- Animations CSS hardware-accelerated
- Limitation des requêtes API
- Cache local avec localStorage

### Compatibilité
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🐛 Résolution des Problèmes

### L'API ne répond pas
- **Cause** : Limite de rate atteinte
- **Solution** : Attendez quelques secondes et réessayez

### Les images ne s'affichent pas
- **Cause** : URL d'image invalide
- **Solution** : L'application affiche automatiquement un placeholder

### Les favoris ne se sauvegardent pas
- **Cause** : localStorage désactivé
- **Solution** : Activez les cookies/localStorage dans votre navigateur

### Erreur CORS
- **Cause** : Ouverture directe du fichier HTML
- **Solution** : Utilisez un serveur local

## 🎮 Raccourcis Clavier

### Page de Notation Rapide
- **← (Flèche gauche)** ou **Q** : Skip l'anime
- **→ (Flèche droite)** ou **L** : Like l'anime

### Navigation
- **Échap** : Fermer les modales

## 🔮 Améliorations Futures

- [ ] Swipe tactile sur mobile pour la notation rapide
- [ ] Mode sombre/clair personnalisable
- [ ] Filtres avancés (genre, année, studio, statut)
- [ ] Tri des favoris (note, date, titre)
- [ ] Export/Import de favoris en JSON
- [ ] Graphiques et statistiques détaillées
- [ ] Partage de favoris avec d'autres utilisateurs
- [ ] Backend réel avec authentification sécurisée
- [ ] Base de données pour les utilisateurs
- [ ] Notifications push pour nouveaux épisodes
- [ ] Mode hors ligne (PWA)
- [ ] Recommandations IA basées sur vos favoris
- [ ] Liste "À regarder" et "En cours" en plus des favoris
- [ ] Intégration calendrier de sortie des épisodes
- [ ] Support multi-langues

## 🎨 Aperçu des Fonctionnalités

### Page d'Accueil
- Grille d'animes avec badges ❤️ pour les favoris
- Recherche instantanée
- Pagination fluide

### Notation Rapide ⚡
- Interface type Tinder/Swipe
- 2 gros boutons : Skip ou Like
- Animations de carte
- Compteurs en temps réel
- Support clavier complet

### Page Favoris
- Liste détaillée avec notes en étoiles
- Commentaires personnalisés
- Boutons Modifier/Supprimer
- Date d'ajout

## 📄 Licence

Ce projet est libre d'utilisation pour des fins éducatives et personnelles.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- Signaler des bugs
- Proposer des fonctionnalités
- Améliorer le code
- Corriger la documentation

## 💡 Crédits

- **API** : [Jikan API v4](https://jikan.moe/) (API non-officielle MyAnimeList)
- **Design** : Inspiré par les applications modernes avec thème violet/rose
- **Concept** : Notation rapide inspirée de Tinder

## 📧 Contact

Pour toute question ou suggestion, n'hésitez pas à ouvrir une issue.

---

**Fait avec ❤️ et beaucoup de ☕**

*Propulsé par l'API Jikan et MyAnimeList*

**Version 2.0** - Avec notation rapide style Tinder ! ⚡

