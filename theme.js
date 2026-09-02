(function () {
    var root = document.documentElement;
    var toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    function updateIcon() {
        var isLight = root.getAttribute('data-theme') === 'light';
        toggle.innerHTML = isLight
            ? '<i class="fa-solid fa-sun"></i>'
            : '<i class="fa-solid fa-moon"></i>';
        toggle.setAttribute('aria-label', isLight ? 'Passer en mode sombre' : 'Passer en mode clair');
    }

    toggle.addEventListener('click', function () {
        var isLight = root.getAttribute('data-theme') === 'light';
        if (isLight) {
            root.removeAttribute('data-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            root.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
        updateIcon();
    });

    updateIcon();
})();