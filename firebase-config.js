// ===== Configuration Firebase =====
// 
// ✅ Credentials Firebase configurés !
// Project ID: projet-anime
//
// Prochaines étapes :
// 1. Activer "Authentication" > "Sign-in method" > "Email/Password"
// 2. Activer "Firestore Database" > "Créer une base de données"
// 3. Déployer les règles de sécurité Firestore
//

const firebaseConfig = {
    apiKey: "AIzaSyDyWFO2mV496Ide4WbKD9pHpsr-rPCsebA",
    authDomain: "projet-anime.firebaseapp.com",
    projectId: "projet-anime",
    storageBucket: "projet-anime.firebasestorage.app",
    messagingSenderId: "481639000989",
    appId: "1:481639000989:web:aa3e70d027864875249d74",
    measurementId: "G-MY8RL11CZ8"
};

// Initialisation Firebase
let app, auth, db;

try {
    // Initialiser Firebase
    app = firebase.initializeApp(firebaseConfig);
    
    // Initialiser les services
    auth = firebase.auth();
    db = firebase.firestore();
    
    console.log('✅ Firebase initialisé avec succès');
} catch (error) {
    console.error('❌ Erreur d\'initialisation Firebase:', error);
    alert('Erreur de configuration Firebase. Veuillez vérifier firebase-config.js');
}

// Activer la persistance locale de Firestore
if (db) {
    db.enablePersistence()
        .then(() => {
            console.log('✅ Persistance Firestore activée');
        })
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('⚠️ Persistance non disponible (plusieurs onglets ouverts)');
            } else if (err.code === 'unimplemented') {
                console.warn('⚠️ Persistance non supportée par ce navigateur');
            }
        });
}

// Export pour utilisation dans d'autres fichiers
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDB = db;
