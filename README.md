# Favanim — Manga Editorial

Revue d'animes communautaire : catalogue, fiches détaillées, favoris notés et commentés, notation rapide.
Site **100 % statique** (HTML/CSS/JS, aucun build) — design éditorial "Manga" (Anton / JetBrains Mono / Inter, jaune shōnen & rouge manga, thème nuit/jour).

## Stack

| Rôle | Service |
|---|---|
| Hébergement | **Vercel** (zéro config) |
| Auth + base de données | **Supabase** (email/password + Postgres avec RLS) |
| Données animes | **API Jikan** (MyAnimeList) — catalogue, fiches, personnages, staff, recommandations |

> ⚠️ Migration Firebase → Supabase faite le 11/06/2026. Les anciens fichiers Firebase ont été supprimés (récupérables via git). **Les comptes/favoris Firebase ne sont pas migrés automatiquement.**

## ✅ À FAIRE pour mettre en ligne (~10 min)

1. **Créer le projet Supabase** sur [supabase.com](https://supabase.com) (gratuit, région ex. `eu-west-3` Paris).
2. **Créer les tables** : dashboard → SQL Editor → coller tout [`supabase-setup.sql`](supabase-setup.sql) → Run.
   (Tables `profiles`, `favorites`, `community_stats` + règles RLS + triggers.)
3. **Renseigner les clés** dans [`supabase-config.js`](supabase-config.js) :
   - dashboard → Settings → API → copier **Project URL** → `SUPABASE_URL`
   - copier la clé **anon public** → `SUPABASE_ANON_KEY`
4. **Recommandé** : Authentication → Sign In / Up → désactiver **"Confirm email"**
   (sinon les inscrits doivent valider un mail avant de pouvoir se connecter — le site gère ce cas, mais c'est une friction).
5. **Déployer sur Vercel** : pousser sur GitHub → [vercel.com](https://vercel.com) → Add New → Project → importer le repo → preset **Other**, build et output **vides** → Deploy.
   (Ou en CLI : `npm i -g vercel` puis `vercel --prod`.)
6. **Vérifier** : catalogue OK sans connexion → créer un compte (onglet 02 Inscription) → ajouter un favori → il apparaît dans Favoris et dans la table `favorites` du dashboard.

Détails complets dans [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md).

### Bon à savoir

- La clé `anon` est **publique par conception** : la sécurité vient des règles RLS (chacun ne lit/écrit que ses données), pas du secret de la clé. Ne jamais mettre la clé `service_role` dans le code.
- `.vercelignore` exclut du déploiement les maquettes standalone (~40 Mo) et les fichiers `.md`/`.sql`.
- Les stats communautaires (`community_stats`) sont écrites uniquement par un trigger SQL, jamais par le navigateur.
- L'API Jikan est limitée à ~3 req/s : la page détail espace ses 5 requêtes (file d'attente + retry sur 429).
- Le site fonctionne sans Supabase configuré (catalogue + fiches) ; seuls connexion et favoris attendent les clés.

## Pages

| Page | Contenu |
|---|---|
| `index.html` | Hero éditorial, compteurs réels, carte "À la une" (n°1 du classement), filtres en chips (type/genres/tri), grille, pagination |
| `anime.html?id=X` | Fiche dédiée "Dossier" : poster, score + votes, infos, relations, musiques (OP/ED), synopsis, personnages + doubleurs, auteur (photo) + ses œuvres, bande-annonce, recommandations |
| `favorites.html` | Collection avec note /5, commentaire, modifier/retirer, stats (nombre + moyenne) |
| `quick-rate.html` | Notation rapide : carte par carte, étoiles + commentaire, barre de progression |
| `profile.html` | Profil : pseudo, photo (crop), stats, derniers favoris, déconnexion |

## Structure du code

```
styles.css            ← design system partagé (tokens, nav, cartes, modales…)
anime.css / favorites.css / quick-rate.css / profile.css   ← styles par page
theme.js              ← thème nuit/jour (persisté localStorage)
supabase-config.js    ← ⚠️ clés à renseigner (étape 3)
auth-supabase.js      ← authManager (auth + favoris + profil) + UI partagée
app.js                ← catalogue (Jikan)
anime.js              ← fiche détail (Jikan, 5 requêtes en file d'attente)
favorites-page.js / quick-rate.js / profile.js / star-rating.js
supabase-setup.sql    ← schéma BDD à exécuter une fois dans Supabase
Favanim - *.html      ← maquettes de design (non déployées)
```
