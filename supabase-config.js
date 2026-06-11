// ===== Configuration Supabase =====
//
// 1. Crée un projet sur https://supabase.com (gratuit)
// 2. Dans le dashboard : Settings > API
//    - copie "Project URL"      → SUPABASE_URL
//    - copie "anon public" key  → SUPABASE_ANON_KEY
// 3. Exécute le script supabase-setup.sql dans SQL Editor (dashboard)
//
// La clé "anon" est publique par conception : la sécurité est assurée
// par les règles RLS (Row Level Security) définies dans supabase-setup.sql.

const SUPABASE_URL = 'VOTRE_URL_SUPABASE';        // ex: https://abcdefgh.supabase.co
const SUPABASE_ANON_KEY = 'VOTRE_CLE_ANON';       // ex: eyJhbGciOiJIUzI1NiIs...

// Initialisation du client Supabase
let supabaseClient = null;

try {
    if (SUPABASE_URL.startsWith('https://')) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase initialisé');
    } else {
        console.warn('⚠️ Supabase non configuré : renseignez SUPABASE_URL et SUPABASE_ANON_KEY dans supabase-config.js');
    }
} catch (error) {
    console.error('❌ Erreur d\'initialisation Supabase:', error);
}

// Export pour utilisation dans d'autres fichiers
window.supabaseClient = supabaseClient;
