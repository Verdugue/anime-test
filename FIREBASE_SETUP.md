# 🔥 Guide de Configuration Firebase pour AnimeHub

## 📋 Prérequis

- Un compte Google
- Node.js installé (pour Firebase CLI)

---

## 🚀 Étape 1 : Créer un Projet Firebase

1. **Aller sur la console Firebase** : https://console.firebase.google.com/

2. **Créer un nouveau projet** :
   - Cliquez sur "Ajouter un projet"
   - Nom du projet : `animehub` (ou votre choix)
   - Acceptez les conditions
   - Google Analytics : optionnel (recommandé : activé)
   - Cliquez sur "Créer le projet"

---

## 🔐 Étape 2 : Activer l'Authentification

1. Dans votre projet Firebase, cliquez sur **"Authentication"** dans le menu de gauche
2. Cliquez sur **"Get started"**
3. Onglet **"Sign-in method"**
4. Activez **"Email/Password"**
   - Cliquez sur "Email/Password"
   - Activez le premier switch (Email/Password)
   - Cliquez sur "Save"

---

## 💾 Étape 3 : Activer Firestore Database

1. Dans le menu de gauche, cliquez sur **"Firestore Database"**
2. Cliquez sur **"Create database"**
3. Choisissez le mode :
   - **Production mode** (recommandé - nous avons des règles de sécurité)
4. Choisissez l'emplacement :
   - Pour l'Europe : `europe-west` ou `europe-west1`
   - Pour l'Amérique du Nord : `us-central`
5. Cliquez sur **"Enable"**

---

## 🌐 Étape 4 : Créer une Application Web

1. Dans la page d'accueil du projet, cliquez sur l'icône **"</>"** (Web)
2. Enregistrez l'application :
   - Nom de l'app : `AnimeHub Web`
   - ✅ Cochez "Firebase Hosting" (recommandé)
   - Cliquez sur **"Register app"**

3. **Copier les credentials Firebase** :
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "animehub-xxxxx.firebaseapp.com",
     projectId: "animehub-xxxxx",
     storageBucket: "animehub-xxxxx.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```

4. **Collez ces valeurs dans `firebase-config.js`** :
   - Ouvrez le fichier `firebase-config.js`
   - Remplacez les valeurs `VOTRE_API_KEY`, etc. par vos vraies valeurs

---

## 📜 Étape 5 : Déployer les Règles de Sécurité

### Option A : Via la Console Firebase (Facile)

1. Allez dans **"Firestore Database"** > **"Rules"**
2. Copiez le contenu du fichier `firestore.rules`
3. Collez-le dans l'éditeur
4. Cliquez sur **"Publish"**

### Option B : Via Firebase CLI (Avancé)

```bash
# Installer Firebase CLI
npm install -g firebase-tools

# Se connecter à Firebase
firebase login

# Initialiser le projet
firebase init

# Déployer les règles
firebase deploy --only firestore:rules
```

---

## 🧪 Étape 6 : Tester l'Application Localement

1. **Ouvrir `index.html`** dans votre navigateur
   - Ou utilisez un serveur local (recommandé)
   
2. **Créer un compte de test** :
   - Cliquez sur "Se connecter" > "S'inscrire"
   - Email : test@test.com
   - Mot de passe : 123456 (ou plus)
   
3. **Vérifier dans Firebase** :
   - Allez dans **Authentication** > **Users**
   - Vous devriez voir votre utilisateur
   - Allez dans **Firestore Database** > **Data**
   - Vous devriez voir les collections `users` et `favorites`

---

## 🌍 Étape 7 : Déployer sur Firebase Hosting (Optionnel)

### 7.1 Installer Firebase CLI

```bash
npm install -g firebase-tools
```

### 7.2 Se connecter à Firebase

```bash
firebase login
```

### 7.3 Initialiser Firebase Hosting

```bash
firebase init hosting
```

Réponses aux questions :
- **What do you want to use as your public directory?** → `.` (point)
- **Configure as a single-page app?** → `No`
- **Set up automatic builds?** → `No`
- **Overwrite index.html?** → `No`

### 7.4 Mettre à jour `.firebaserc`

Ouvrez `.firebaserc` et remplacez `votre-project-id` par votre vrai ID de projet.

### 7.5 Déployer

```bash
firebase deploy
```

Votre site sera disponible sur : `https://votre-project-id.web.app`

---

## 📊 Étape 8 : Configurer les Index Firestore

Quand vous ajoutez des favoris, vous pourriez voir une erreur dans la console demandant de créer un index.

### Option A : Cliquer sur le lien dans l'erreur
L'erreur contiendra un lien direct pour créer l'index.

### Option B : Via Firebase CLI
```bash
firebase deploy --only firestore:indexes
```

---

## ✅ Vérification Finale

### Checklist de Vérification

- [ ] Projet Firebase créé
- [ ] Authentication Email/Password activée
- [ ] Firestore Database créée
- [ ] Application Web enregistrée
- [ ] Credentials copiés dans `firebase-config.js`
- [ ] Règles de sécurité déployées
- [ ] Test de création de compte réussi
- [ ] Test d'ajout de favoris réussi

### Test des Fonctionnalités

1. **Inscription** : Créer un nouveau compte
2. **Connexion** : Se connecter avec le compte
3. **Ajouter aux favoris** : Ajouter un anime aux favoris
4. **Voir les favoris** : Aller sur la page "Favoris"
5. **Modifier un favori** : Changer la note ou le commentaire
6. **Supprimer un favori** : Retirer un anime des favoris
7. **Déconnexion** : Se déconnecter
8. **Reconnexion** : Se reconnecter et vérifier que les favoris sont toujours là

---

## 🔧 Dépannage

### Erreur : "Firebase not defined"
- Vérifiez que les scripts Firebase sont bien chargés dans les fichiers HTML
- Vérifiez que `firebase-config.js` est chargé avant `auth-firebase.js`

### Erreur : "Missing or insufficient permissions"
- Vérifiez que les règles de sécurité Firestore sont bien déployées
- Vérifiez que vous êtes bien connecté

### Erreur : "The email address is badly formatted"
- Utilisez un email valide (avec @)

### Les favoris ne s'affichent pas
- Ouvrez la console du navigateur (F12)
- Vérifiez les erreurs
- Allez dans Firestore Database et vérifiez que les documents sont bien créés

### Index manquant
- Cliquez sur le lien dans l'erreur de la console
- Ou déployez les index : `firebase deploy --only firestore:indexes`

---

## 📈 Fonctionnalités Communautaires

L'application inclut des statistiques communautaires :

- **Nombre de favoris** par anime
- **Note moyenne** de la communauté
- **Top animes** les plus ajoutés

Ces données sont stockées dans la collection `community_stats` et se mettent à jour automatiquement quand un utilisateur ajoute un anime à ses favoris.

---

## 🎉 Félicitations !

Votre application AnimeHub est maintenant connectée à Firebase et prête à être utilisée !

### Prochaines Étapes

- Invitez des amis à créer des comptes
- Ajoutez des animes à vos favoris
- Explorez les statistiques communautaires
- (Optionnel) Personnalisez le design
- (Optionnel) Ajoutez de nouvelles fonctionnalités

---

## 📞 Support

Pour toute question :
- Documentation Firebase : https://firebase.google.com/docs
- API Jikan : https://docs.api.jikan.moe/

---

**Fait avec ❤️ pour la communauté anime**

