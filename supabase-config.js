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

const SUPABASE_URL = 'https://tuxwabczczevyrhduhlo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1eHdhYmN6Y3pldnlyaGR1aGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNDY5MDcsImV4cCI6MjA5NjgyMjkwN30.6Q7cDUznl5fEjSvIc_nuWLqv8SFLWUfzr2wBsP_sGiM';

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
