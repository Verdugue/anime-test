// ===== Thème Favanim (nuit / jour) =====
// Chargé dans <head> : applique le thème avant le premier rendu pour éviter le flash.

(function () {
    var saved = null;
    try { saved = localStorage.getItem('favanim-theme'); } catch (e) { /* stockage indisponible */ }
    document.documentElement.setAttribute('data-theme', saved === 'light' ? 'light' : 'dark');
})();

document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('themeToggle');
    if (!btn) return;

    var ICON_SUN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>';
    var ICON_MOON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

    function render() {
        var isLight = document.documentElement.getAttribute('data-theme') === 'light';
        btn.innerHTML = isLight ? ICON_MOON : ICON_SUN;
        btn.setAttribute('aria-label', isLight ? 'Passer en mode nuit' : 'Passer en mode jour');
    }

    btn.addEventListener('click', function () {
        var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem('favanim-theme', next); } catch (e) { /* stockage indisponible */ }
        render();
    });

    render();
});
