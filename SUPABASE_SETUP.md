# Favanim — Installation Supabase + Vercel

Le site est 100 % statique : pas de build, pas de serveur. Supabase fournit
l'authentification et la base de données, Vercel l'hébergement.

## 1. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com) → **New project** (gratuit).
2. Choisis un nom (ex. `favanim`), un mot de passe base de données, une région (ex. `eu-west-3` Paris).

## 2. Créer les tables

1. Dashboard → **SQL Editor** → **New query**.
2. Colle tout le contenu de [`supabase-setup.sql`](supabase-setup.sql) → **Run**.

Ça crée :
- `profiles` — pseudo + photo de profil, créé automatiquement à l'inscription (trigger)
- `favorites` — favoris avec note et commentaire (1 ligne par utilisateur × anime)
- `community_stats` — statistiques agrégées, mises à jour par trigger (jamais écrites par le client)
- Les règles **RLS** : chacun ne voit / modifie que ses propres données.

## 3. Configurer l'authentification

Dashboard → **Authentication** → **Sign In / Up** :
- **Email** est activé par défaut → rien à faire.
- Recommandé pour une UX simple : désactive **"Confirm email"**
  (sinon les nouveaux inscrits doivent cliquer un lien reçu par mail avant de pouvoir se connecter —
  le site gère ce cas avec une notification, mais c'est une étape de plus).

## 4. Renseigner les clés dans le code

Dashboard → **Settings** → **API** (ou **Project Settings** → **Data API**) :

Dans [`supabase-config.js`](supabase-config.js), remplace :

```js
const SUPABASE_URL = 'VOTRE_URL_SUPABASE';   // → Project URL (https://xxxx.supabase.co)
const SUPABASE_ANON_KEY = 'VOTRE_CLE_ANON';  // → clé "anon public"
```

> La clé `anon` est **publique par conception** (elle sera visible dans le navigateur).
> La sécurité vient des règles RLS du SQL, pas du secret de la clé.
> Ne mets **jamais** la clé `service_role` dans le code du site.

## 5. Déployer sur Vercel

### Option A — via GitHub (recommandé)
1. Pousse le repo sur GitHub.
2. [vercel.com](https://vercel.com) → **Add New** → **Project** → importe le repo.
3. Framework preset : **Other** · Build command : *(vide)* · Output directory : *(vide)*.
4. **Deploy**. Chaque `git push` redéploie automatiquement.

### Option B — via CLI
```bash
npm i -g vercel
vercel          # première fois : répond aux questions
vercel --prod   # déploiement en production
```

Le fichier `.vercelignore` exclut déjà les maquettes standalone (40 Mo) du déploiement.

## 6. Vérifier

1. Ouvre le site déployé → le catalogue (API Jikan) doit s'afficher même sans Supabase.
2. **Se connecter** → onglet **02 Inscription** → crée un compte.
3. Ajoute un favori (cœur d'une carte ou page détail) → il doit apparaître dans **Favoris**
   et dans la table `favorites` du dashboard Supabase.

## Correspondance avec l'ancienne version Firebase

| Avant (Firebase)              | Après (Supabase)                          |
|-------------------------------|-------------------------------------------|
| Firebase Auth email/password  | Supabase Auth email/password              |
| Firestore `users`             | table `profiles` (+ trigger à l'inscription) |
| Firestore `favorites`         | table `favorites` (PK `user_id, anime_id`) |
| Firestore `community_stats`   | table `community_stats` (trigger SQL)      |
| Firebase Hosting              | Vercel                                     |
| `firebase-config.js` / `auth-firebase.js` | `supabase-config.js` / `auth-supabase.js` |

⚠️ Les comptes et favoris existants dans Firebase ne sont **pas migrés automatiquement**.
Si tu as des données à conserver, dis-le : un script d'export Firestore → import Supabase est possible.
