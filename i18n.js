var translations = {
    fr: {
        "nav.home": "Accueil",
        "nav.crew": "Équipage",
        "nav.position": "Position en temps réel",
        "nav.live": "Live vidéo",
        "lang.chooseLabel": "Choisir la langue",
        "theme.toLight": "Passer en mode clair",
        "theme.toDark": "Passer en mode sombre",
        "footer.update": "Mise à jour 09/2026.",

        "index.title": "Suivi ISS",
        "home.kicker": "Station spatiale internationale",
        "home.title": "25 ans de présence humaine dans l'espace",
        "home.lead": "Suivez la position de l'ISS en direct, découvrez qui compose son équipage actuel et regardez le flux vidéo en provenance de la NASA.",
        "home.cta": "Voir où elle se trouve maintenant",
        "home.tile.position.title": "Position en temps réel",
        "home.tile.position.desc": "Repérez l'ISS sur la carte et suivez son déplacement au-dessus de la Terre.",
        "home.tile.crew.title": "Équipage",
        "home.tile.crew.desc": "Découvrez les astronautes au cœur de cette aventure hors du commun.",
        "home.tile.live.title": "Live vidéo",
        "home.tile.live.desc": "Plongez au cœur de la mission et regardez les images en direct depuis la NASA.",
        "home.about.title": "Qu'est-ce que l'ISS ?",
        "home.about.p1": "La Station spatiale internationale est un laboratoire scientifique en orbite, construit grâce à la collaboration de plusieurs agences spatiales, notamment la NASA, Roscosmos, l'ESA, la JAXA et l'Agence spatiale canadienne. Sa construction a commencé en 1998, et elle est habitée en permanence depuis novembre 2000.",
        "home.about.p2": "L'ISS permet aux astronautes de mener des expériences en microgravité, dans des domaines qui vont de la médecine à la science des matériaux. Elle reste aussi l'un des exemples les plus concrets de coopération internationale dans l'espace.",

        "equipage.title": "Équipage — Suivi ISS",
        "equipage.kicker": "Équipage",
        "equipage.h1": "Sept personnes vivent actuellement à bord de l'ISS.",
        "equipage.lead": "Les visages derrière la mission.",
        "role.commander": "Commandante",
        "role.flightEngineer": "Ingénieur de vol",
        "flag.us": "États-Unis",
        "flag.fr": "France",
        "flag.ru": "Russie",

        "position.title": "Position — Suivi ISS",
        "position.kicker": "Position en temps réel",
        "position.live": "En direct",
        "position.altitude": "Altitude",
        "position.velocity": "Vitesse",
        "position.latitude": "Latitude",
        "position.longitude": "Longitude",

        "live.title": "Live vidéo — Suivi ISS",
        "live.kicker": "Live vidéo",
    },
    en: {
        "nav.home": "Home", 
        "nav.crew": "Crew", 
        "nav.position": "Real-time position", 
        "nav.live": "Live video", 
        "lang.chooseLabel": "Choose language", 
        "theme.toLight": "Switch to light mode", 
        "theme.toDark": "Switch to dark mode", 
        "footer.update": "Updated 09/2026.", 
        
        "index.title": "ISS Tracker", 
        "home.kicker": "International Space Station", 
        "home.title": "25 years of human presence in space", 
        "home.lead": "Follow the ISS's position live, discover who makes up its current crew and watch the video feed coming from NASA.", 
        "home.cta": "See where it is now", 
        "home.tile.position.title": "Real-time position", 
        "home.tile.position.desc": "Spot the ISS on the map and follow its movement above the Earth.", 
        "home.tile.crew.title": "Crew", 
        "home.tile.crew.desc": "Discover the astronauts at the heart of this extraordinary adventure.", 
        "home.tile.live.title": "Live video", 
        "home.tile.live.desc": "Dive into the heart of the mission and watch the live images from NASA.", 
        "home.about.title": "What is the ISS?", 
        "home.about.p1": "The International Space Station is a scientific laboratory in orbit, built through the collaboration of several space agencies, including NASA, Roscosmos, ESA, JAXA and the Canadian Space Agency. Its construction began in 1998, and it has been continuously inhabited since November 2000.", 
        "home.about.p2": "The ISS allows astronauts to conduct experiments in microgravity, in fields ranging from medicine to materials science. It also remains one of the most concrete examples of international cooperation in space.", 
        
        "equipage.title": "Crew — ISS Tracker", 
        "equipage.kicker": "Crew", "equipage.h1": 
        "Seven people currently live aboard the ISS.", 
        "equipage.lead": "The faces behind the mission.", 
        "role.commander": "Commander", 
        "role.flightEngineer": "Flight Engineer", 
        "flag.us": "United States", 
        "flag.fr": "France", 
        "flag.ru": "Russia",

        "position.title": "Position — ISS Tracker", 
        "position.kicker": "Real-time position", 
        "position.live": "Live", 
        "position.altitude": "Altitude", 
        "position.velocity": "Velocity", 
        "position.latitude": "Latitude", 
        "position.longitude": "Longitude", 
        "live.title": "Live video — ISS Tracker", 
        "live.kicker": "Live video"
    }
};

function getLang() {
    return localStorage.getItem('lang') || 'fr';
}
 
function t(key) {
    var lang = getLang();
    if (translations[lang] && translations[lang][key] !== undefined) {
        return translations[lang][key];
    }
    return translations.fr[key] !== undefined ? translations.fr[key] : key;
}
 
function updateLangToggleUI() {
    var btn = document.getElementById('lang-toggle');
    if (!btn) return;
    var lang = getLang();
    btn.textContent = lang.toUpperCase();
    btn.setAttribute('aria-label', t('lang.chooseLabel') + ' (' + lang.toUpperCase() + ')');
}
 
function applyTranslations() {
    var lang = getLang();
    document.documentElement.setAttribute('lang', lang);
 
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
        el.textContent = t(el.getAttribute('data-i18n'));
    });
 
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
        el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
 
    document.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
        el.setAttribute('alt', t(el.getAttribute('data-i18n-alt')));
    });
 
    updateLangToggleUI();
    if (window.updateThemeToggleLabel) window.updateThemeToggleLabel();
}
 
function setLang(lang) {
    localStorage.setItem('lang', lang);
    applyTranslations();
}
 
document.addEventListener('DOMContentLoaded', function () {
    applyTranslations();
 
    var btn = document.getElementById('lang-toggle');
    if (btn) {
        btn.addEventListener('click', function () {
            setLang(getLang() === 'fr' ? 'en' : 'fr');
        });
    }
});
 
window.t = t;
window.getLang = getLang;