// ===== Page détails anime — Favanim =====
const JIKAN_API_BASE = 'https://api.jikan.moe/v4';

const animeId = parseInt(new URLSearchParams(window.location.search).get('id'), 10);
if (!animeId) {
    window.location.replace('index.html');
}

let currentAnime = null;
let currentIsFav = false;

// ===== File d'attente Jikan (max ~2 req/s, retry sur 429) =====
let nextSlot = 0;
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function jikanFetch(path) {
    const now = Date.now();
    const at = Math.max(now, nextSlot);
    nextSlot = at + 450;
    if (at > now) await sleep(at - now);

    for (let attempt = 0; attempt < 3; attempt++) {
        const response = await fetch(`${JIKAN_API_BASE}${path}`);
        if (response.status === 429) {
            await sleep(1500);
            continue;
        }
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }
        return (await response.json()).data;
    }
    throw new Error('API saturée, réessayez');
}

// ===== Utilitaires =====
function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const STATUS_FR = {
    'Finished Airing': 'Terminé',
    'Currently Airing': 'En cours',
    'Not yet aired': 'À venir'
};
const SEASON_FR = { winter: 'Hiver', spring: 'Printemps', summer: 'Été', fall: 'Automne' };
const RELATION_FR = {
    'Adaptation': 'Adaptation',
    'Sequel': 'Suite',
    'Prequel': 'Préquelle',
    'Side Story': 'Histoire parallèle',
    'Side story': 'Histoire parallèle',
    'Spin-Off': 'Spin-off',
    'Spin-off': 'Spin-off',
    'Alternative Version': 'Version alternative',
    'Alternative version': 'Version alternative',
    'Alternative Setting': 'Univers alternatif',
    'Alternative setting': 'Univers alternatif',
    'Summary': 'Résumé',
    'Parent Story': 'Histoire principale',
    'Parent story': 'Histoire principale',
    'Full Story': 'Histoire complète',
    'Full story': 'Histoire complète',
    'Character': 'Personnages communs',
    'Other': 'Autre'
};
const POSITION_FR = {
    'Original Creator': 'Œuvre originale · Mangaka',
    'Director': 'Réalisateur'
};

function imageOf(obj) {
    return obj?.images?.jpg?.large_image_url || obj?.images?.jpg?.image_url || obj?.images?.webp?.image_url || '';
}

// ===== Rendu principal =====
function renderMain(anime) {
    const title = anime.title || anime.title_english || 'Sans titre';
    const titleJp = anime.title_japanese || '';
    const year = anime.year || anime.aired?.prop?.from?.year || '';

    document.title = `${title} — Favanim`;
    document.getElementById('crumbTitle').textContent = title;

    // Poster
    document.getElementById('posterFallback').textContent = titleJp || title;
    const posterImg = document.getElementById('posterImg');
    const imageUrl = imageOf(anime);
    if (imageUrl) {
        posterImg.style.display = '';
        posterImg.src = imageUrl;
    }

    // Score
    document.getElementById('scoreNum').textContent = anime.score != null ? anime.score.toFixed(1) : '—';
    document.getElementById('scoreStars').innerHTML = starsMarkup(anime.score || 0);
    document.getElementById('scoreVotes').textContent = anime.scored_by != null
        ? `${anime.scored_by.toLocaleString('fr-FR')} votes`
        : 'Pas encore de votes';

    // En-tête
    document.getElementById('detailEyebrow').textContent =
        `— Fiche ${anime.rank ? String(anime.rank).padStart(3, '0') : '—'}${year ? ` · ${year}` : ''}`;
    document.getElementById('detailTitle').textContent = title;
    document.getElementById('detailJp').textContent = titleJp;

    // Tags : genres + thèmes + démographies
    const tape = document.getElementById('genreTape');
    const tags = []
        .concat((anime.genres || []).map(g => ({ name: g.name, cls: 'tag' })))
        .concat((anime.explicit_genres || []).map(g => ({ name: g.name, cls: 'tag red' })))
        .concat((anime.themes || []).map(g => ({ name: g.name, cls: 'tag' })))
        .concat((anime.demographics || []).map(g => ({ name: g.name, cls: 'tag solid' })));
    tape.innerHTML = tags.map(t => `<span class="${t.cls}">${esc(t.name)}</span>`).join('');

    // Synopsis
    document.getElementById('synopsis').textContent = anime.synopsis || 'Pas de synopsis disponible.';
    if (anime.background) {
        const bg = document.getElementById('synopsisBackground');
        bg.textContent = anime.background;
        bg.style.display = '';
    }

    // Colonne infos
    const season = anime.season ? `${SEASON_FR[anime.season] || anime.season} ${anime.year || ''}`.trim() : (year || '—');
    const rows = [
        ['Studio', anime.studios?.[0]?.name || '—'],
        ['Type', anime.type || '—'],
        ['Épisodes', anime.episodes != null ? anime.episodes : 'En cours'],
        ['Saison', season],
        ['Statut', STATUS_FR[anime.status] || anime.status || '—'],
        ['Source', anime.source || '—'],
        ['Durée', anime.duration ? anime.duration.replace(' per ep', ' / ép.').replace('min', 'min') : '—'],
        ['Classification', anime.rating ? anime.rating.split(' - ')[0] : '—'],
        ['Classement', anime.rank ? `№ ${anime.rank}` : '—'],
        ['Popularité', anime.popularity ? `# ${anime.popularity}` : '—']
    ];
    document.getElementById('infoRows').innerHTML = rows.map(([k, v]) => `
        <div class="dt-row">
            <dt class="t-mono">${esc(k)}</dt>
            <dd>${esc(v)}</dd>
        </div>
    `).join('');

    // Relations (suites, préquelles, adaptations…)
    renderRelations(anime.relations || []);

    // Musiques (openings / endings)
    renderThemes(anime.theme || {});

    // Bande-annonce
    if (anime.trailer?.embed_url) {
        let embed = anime.trailer.embed_url.replace(/autoplay=1/g, 'autoplay=0');
        if (!embed.includes('autoplay=')) {
            embed += (embed.includes('?') ? '&' : '?') + 'autoplay=0';
        }
        document.getElementById('trailerEmbed').innerHTML = `
            <iframe src="${esc(embed)}" frameborder="0"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen></iframe>
        `;
        document.getElementById('trailerSection').style.display = '';
        const trailerBtn = document.getElementById('trailerBtn');
        trailerBtn.style.display = '';
        trailerBtn.addEventListener('click', () => {
            document.getElementById('trailerSection').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Afficher la fiche
    document.getElementById('detailLoading').style.display = 'none';
    document.getElementById('detailGrid').style.display = '';
}

function starsMarkup(score10) {
    const out5 = score10 / 2;
    let html = '';
    for (let n = 1; n <= 5; n++) {
        html += `<span class="dt-star ${out5 >= n - 0.25 ? 'on' : ''}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7 7.5.5-5.7 5 1.7 7.5L12 18l-6.5 4 1.7-7.5L1.5 9.5 9 9z"/></svg>
        </span>`;
    }
    return html;
}

function renderRelations(relations) {
    const rows = [];
    relations.forEach(rel => {
        (rel.entry || []).forEach(entry => {
            rows.push({ kind: RELATION_FR[rel.relation] || rel.relation, entry });
        });
    });
    if (rows.length === 0) return;

    document.getElementById('relationsList').innerHTML = rows.slice(0, 8).map(({ kind, entry }) => `
        <div class="dt-rel-row">
            <span class="dt-rel-kind">${esc(kind)} · ${esc(entry.type)}</span>
            ${entry.type === 'anime'
                ? `<a href="anime.html?id=${entry.mal_id}">${esc(entry.name)}</a>`
                : `<span class="dt-rel-name">${esc(entry.name)}</span>`}
        </div>
    `).join('');
    document.getElementById('relationsSection').style.display = '';
}

function renderThemes(theme) {
    const rows = []
        .concat((theme.openings || []).slice(0, 3).map(t => ({ label: 'OP', text: t })))
        .concat((theme.endings || []).slice(0, 3).map(t => ({ label: 'ED', text: t })));
    if (rows.length === 0) return;

    document.getElementById('themesList').innerHTML = rows.map(r => `
        <div class="dt-theme-row"><strong>${r.label}</strong> ${esc(r.text)}</div>
    `).join('');
    document.getElementById('themesSection').style.display = '';
}

// ===== Personnages =====
async function loadCharacters() {
    try {
        const characters = await jikanFetch(`/anime/${animeId}/characters`);
        if (!characters || characters.length === 0) return;

        // Personnages principaux d'abord
        const sorted = [...characters].sort((a, b) => {
            if (a.role === b.role) return (b.favorites || 0) - (a.favorites || 0);
            return a.role === 'Main' ? -1 : 1;
        }).slice(0, 10);

        document.getElementById('charactersGrid').innerHTML = sorted.map(c => {
            const img = imageOf(c.character);
            const va = (c.voice_actors || []).find(v => v.language === 'Japanese');
            return `
                <div class="dt-char">
                    <div class="dt-char-portrait">
                        <img src="${esc(img)}" alt="${esc(c.character.name)}" loading="lazy" onerror="this.style.display='none'">
                    </div>
                    <div class="dt-char-name">${esc(c.character.name)}</div>
                    <div class="dt-char-role ${c.role === 'Main' ? 'main' : ''}">${c.role === 'Main' ? 'Principal' : 'Secondaire'}</div>
                    ${va ? `<div class="dt-char-va">VA · ${esc(va.person.name)}</div>` : ''}
                </div>
            `;
        }).join('');
        document.getElementById('charactersSection').style.display = '';
    } catch (error) {
        console.error('Erreur personnages:', error);
    }
}

// ===== Auteur (créateur original) + ses autres œuvres =====
async function loadAuthor() {
    try {
        const staff = await jikanFetch(`/anime/${animeId}/staff`);
        if (!staff) return;

        let entry = staff.find(s => (s.positions || []).includes('Original Creator'));
        if (!entry) entry = staff.find(s => (s.positions || []).includes('Director'));
        if (!entry) return;

        const role = (entry.positions || []).includes('Original Creator') ? 'Original Creator' : 'Director';

        document.getElementById('authorName').textContent = entry.person.name;
        document.getElementById('authorRole').textContent = POSITION_FR[role] || role;
        const photo = imageOf(entry.person);
        if (photo) {
            const photoEl = document.getElementById('authorPhoto');
            photoEl.style.display = '';
            photoEl.src = photo;
        }
        document.getElementById('authorSection').style.display = '';

        // Ses autres œuvres (mangas + animes en tant que créateur original)
        const person = await jikanFetch(`/people/${entry.person.mal_id}/full`);
        const works = [];
        const seen = new Set();
        const seenTitles = new Set([(currentAnime?.title || '').toLowerCase()]);

        (person.manga || []).forEach(w => {
            const m = w.manga;
            if (!m || seen.has('m' + m.mal_id) || seenTitles.has(m.title.toLowerCase())) return;
            seen.add('m' + m.mal_id);
            seenTitles.add(m.title.toLowerCase());
            works.push({
                title: m.title,
                img: imageOf(m),
                type: 'Manga',
                href: m.url,
                external: true
            });
        });

        (person.anime || []).forEach(w => {
            const a = w.anime;
            if (!a || a.mal_id === animeId || seen.has('a' + a.mal_id) || seenTitles.has(a.title.toLowerCase())) return;
            if (!(w.position || '').includes('Original Creator')) return;
            seen.add('a' + a.mal_id);
            seenTitles.add(a.title.toLowerCase());
            works.push({
                title: a.title,
                img: imageOf(a),
                type: 'Anime',
                href: `anime.html?id=${a.mal_id}`,
                external: false
            });
        });

        if (works.length > 0) {
            document.getElementById('authorWorks').innerHTML = works.slice(0, 8).map(w => `
                <a class="dt-related-item" href="${esc(w.href)}" ${w.external ? 'target="_blank" rel="noopener"' : ''}>
                    <div class="dt-related-poster">
                        <span class="tag accent dt-related-type">${w.type}</span>
                        <img src="${esc(w.img)}" alt="${esc(w.title)}" loading="lazy" onerror="this.style.display='none'">
                    </div>
                    <div class="dt-related-title">${esc(w.title)}</div>
                </a>
            `).join('');
            document.getElementById('authorWorksWrap').style.display = '';
        }
    } catch (error) {
        console.error('Erreur auteur:', error);
    }
}

// ===== Recommandations ("Dans la même veine") =====
async function loadRecommendations() {
    try {
        const recos = await jikanFetch(`/anime/${animeId}/recommendations`);
        if (!recos || recos.length === 0) return;

        document.getElementById('recoGrid').innerHTML = recos.slice(0, 4).map(r => `
            <a class="dt-related-item" href="anime.html?id=${r.entry.mal_id}">
                <div class="dt-related-poster">
                    <img src="${esc(imageOf(r.entry))}" alt="${esc(r.entry.title)}" loading="lazy" onerror="this.style.display='none'">
                </div>
                <div class="dt-related-title">${esc(r.entry.title)}</div>
            </a>
        `).join('');
        document.getElementById('recoSection').style.display = '';
    } catch (error) {
        console.error('Erreur recommandations:', error);
    }
}

// ===== Favoris =====
const favBtn = document.getElementById('favBtn');
const rateBtn = document.getElementById('rateBtn');
let starRatingInstance = null;
let selectedRatingValue = 0;

function setFavBtn(isFav) {
    currentIsFav = isFav;
    favBtn.classList.toggle('btn-primary', !isFav);
    favBtn.innerHTML = isFav ? '♥ Dans tes favoris' : '♡ Ajouter aux favoris';
}

async function initFavState() {
    // Attendre que l'authentification soit prête (max 5 s)
    let attempts = 0;
    while (!authManager.authInitialized && attempts < 50) {
        await sleep(100);
        attempts++;
    }
    if (authManager.isLoggedIn()) {
        setFavBtn(await authManager.isFavorite(animeId));
    }
}

function requireLogin() {
    openModal(document.getElementById('authModal'));
    showNotification('Connectez-vous pour gérer vos favoris', 'info');
}

favBtn.addEventListener('click', async () => {
    if (!authManager.isLoggedIn()) { requireLogin(); return; }
    if (currentIsFav) {
        if (confirm('Voulez-vous retirer cet anime de vos favoris ?')) {
            await authManager.removeFavorite(animeId);
            setFavBtn(false);
            await updateFavoritesCount();
            showNotification('Retiré des favoris', 'info');
        }
    } else {
        openRateModal('add');
    }
});

rateBtn.addEventListener('click', async () => {
    if (!authManager.isLoggedIn()) { requireLogin(); return; }
    if (currentIsFav) {
        const favorites = await authManager.getFavorites();
        const fav = favorites.find(f => f.mal_id === animeId);
        openRateModal('edit', fav);
    } else {
        openRateModal('add');
    }
});

function openRateModal(mode, fav = null) {
    if (!currentAnime) return;

    const heading = document.getElementById('rateModalHeading');
    heading.textContent = mode === 'edit' ? 'Modifier mon avis' : 'Ajouter aux favoris';

    const initialRating = fav?.userRating || 0;
    const initialComment = fav?.userComment || '';

    document.getElementById('addToFavoritesContent').innerHTML = `
        <div class="rate-form">
            <div class="rate-form-anime">
                <img src="${esc(imageOf(currentAnime))}" alt="${esc(currentAnime.title)}">
                <div>
                    <div class="rate-form-anime-title">${esc(currentAnime.title)}</div>
                    <div class="rate-form-anime-sub">${esc(currentAnime.type || 'TV')} · ${currentAnime.episodes || '?'} épisodes</div>
                </div>
            </div>

            <div>
                <div class="t-eyebrow">Ta note *</div>
                <div class="stars-input" id="starsInput" style="margin-top: 10px;"></div>
                <div class="rate-value t-mono">Note sélectionnée : <strong id="selectedRatingValue">${initialRating}</strong>/5</div>
            </div>

            <div>
                <div class="t-eyebrow" style="margin-bottom: 8px;">Ton avis (optionnel)</div>
                <textarea id="rateComment" class="input-area" placeholder="Partagez votre avis sur cet anime…">${esc(initialComment)}</textarea>
            </div>

            <button class="btn btn-primary" id="rateConfirmBtn">
                ${mode === 'edit' ? 'Enregistrer les modifications →' : '♥ Ajouter à mes favoris'}
            </button>
        </div>
    `;

    selectedRatingValue = initialRating;
    starRatingInstance = createStarRating('starsInput', initialRating, (rating) => {
        document.getElementById('selectedRatingValue').textContent = rating;
        selectedRatingValue = rating;
    });

    document.getElementById('rateConfirmBtn').addEventListener('click', () => confirmRate(mode));

    openModal(document.getElementById('addToFavoritesModal'));
}

async function confirmRate(mode) {
    if (selectedRatingValue === 0) {
        showNotification('Veuillez sélectionner une note', 'error');
        return;
    }
    const comment = document.getElementById('rateComment').value.trim();

    try {
        if (mode === 'edit') {
            await authManager.updateFavorite(animeId, selectedRatingValue, comment);
            showNotification('Avis mis à jour', 'success');
        } else {
            await authManager.addFavorite(currentAnime, selectedRatingValue, comment);
            setFavBtn(true);
            showNotification('Ajouté aux favoris ♥', 'success');
        }
        closeModal(document.getElementById('addToFavoritesModal'));
        await updateFavoritesCount();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// ===== Navigation =====
document.getElementById('backBtn').addEventListener('click', () => {
    let sameOrigin = false;
    try {
        sameOrigin = document.referrer && new URL(document.referrer).origin === window.location.origin;
    } catch (e) { /* referrer invalide */ }
    if (sameOrigin && window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = 'index.html';
    }
});

// ===== Initialisation =====
function showDetailError() {
    document.getElementById('detailLoading').style.display = 'none';
    document.getElementById('detailError').style.display = '';
}

async function initDetailPage() {
    try {
        const anime = await jikanFetch(`/anime/${animeId}/full`);
        currentAnime = anime;
        renderMain(anime);
    } catch (error) {
        console.error('Erreur fiche:', error);
        showDetailError();
        return;
    }

    initFavState();
    loadCharacters();
    loadAuthor();
    loadRecommendations();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDetailPage);
} else {
    initDetailPage();
}
