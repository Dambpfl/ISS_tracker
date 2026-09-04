(function () {
    'use strict';

    var PHOTOS_PAR_RECHERCHE = 100;

    var photosCourantes = [];
    var indexPhotoActive = 0;
    var chargementEnCours = false;
    var dernierElementFocus = null;
    var searchMode = 'sol'; // 'sol' | 'date'

    // --- Validation / assainissement des entrées ---
    // On ne fait confiance ni à ce qui vient du formulaire, ni à ce qui vient de l'API.
    var ROVERS_VALIDES = ['perseverance', 'curiosity'];
    var DATE_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

    function roverValide(val) {
        return ROVERS_VALIDES.indexOf(val) !== -1 ? val : 'perseverance';
    }

    function solValide(val) {
        var n = parseInt(val, 10);
        return Number.isInteger(n) && n >= 0 ? n : null;
    }

    function dateValide(val) {
        if (typeof val !== 'string' || !DATE_ISO_RE.test(val)) return null;
        var d = new Date(val + 'T00:00:00Z');
        return isNaN(d.getTime()) ? null : val;
    }

    // N'accepte que des URLs d'images https, pour éviter les schémas javascript:/data: douteux.
    function urlImageValide(val) {
        if (typeof val !== 'string') return null;
        try {
            var u = new URL(val, window.location.href);
            return u.protocol === 'https:' ? u.href : null;
        } catch (e) {
            return null;
        }
    }

    // --- Éléments ---
    var roverSelect = document.getElementById('roverSelect');
    var solInput = document.getElementById('solInput');
    var dateInput = document.getElementById('dateInput');
    var solMinusBtn = document.getElementById('solMinus');
    var solPlusBtn = document.getElementById('solPlus');
    var solModeWrap = document.getElementById('solModeWrap');
    var modeSolBtn = document.getElementById('modeSolBtn');
    var modeDateBtn = document.getElementById('modeDateBtn');
    var searchInputLabel = document.getElementById('searchInputLabel');
    var searchBtn = document.getElementById('searchBtn');
    var clearCacheBtn = document.getElementById('clearCacheBtn');
    var statusEl = document.getElementById('status');
    var galleryEl = document.getElementById('gallery');
    var modal = document.getElementById('imageModal');
    var modalImg = document.getElementById('modalImg');
    var modalCaption = document.getElementById('modalCaption');
    var modalClose = document.getElementById('modalClose');
    var modalPrev = document.getElementById('modalPrev');
    var modalNext = document.getElementById('modalNext');

    if (!roverSelect) return; // page non chargée / éléments manquants

    // --- Conversion Date Terre <-> Sol martien (approximative) ---
    // Sol martien : 24h 39m 35,244s. Date d'atterrissage (sol 0) de chaque rover en UTC.
    var MARS_SOL_MS = 88775244;
    var ROVER_LANDING_UTC = {
        perseverance: Date.UTC(2021, 1, 18, 20, 55, 0),
        curiosity: Date.UTC(2012, 7, 6, 5, 17, 57)
    };

    function earthDateToSol(rover, isoDate) {
        var landing = ROVER_LANDING_UTC[rover];
        if (!landing || !isoDate) return null;
        var parts = isoDate.split('-').map(Number);
        // Midi UTC pour limiter l'erreur d'arrondi liée aux fuseaux horaires
        var target = Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
        var diff = target - landing;
        return Math.max(0, Math.floor(diff / MARS_SOL_MS));
    }

    function solToEarthDate(rover, sol) {
        var landing = ROVER_LANDING_UTC[rover];
        if (!landing || sol === '' || isNaN(Number(sol))) return null;
        var ms = landing + Number(sol) * MARS_SOL_MS;
        return new Date(ms).toISOString().split('T')[0];
    }

    // --- IndexedDB (avec repli silencieux si indisponible) ---
    var DB_NAME = 'MarsRoversDB';
    var STORE_NAME = 'photos';
    var indexedDBDisponible = 'indexedDB' in window;

    function openDB() {
        return new Promise(function (resolve, reject) {
            if (!indexedDBDisponible) return reject(new Error('IndexedDB indisponible'));
            var request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = function () {
                request.result.createObjectStore(STORE_NAME);
            };
            request.onsuccess = function () { resolve(request.result); };
            request.onerror = function () { reject(request.error); };
        });
    }

    function setCache(key, val) {
        return openDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).put(val, key);
                tx.oncomplete = function () { resolve(); };
                tx.onerror = function () { reject(tx.error); };
            });
        }).catch(function () {
            // Pas de cache possible (navigation privée, etc.) : on continue sans planter.
        });
    }

    function getCache(key) {
        return openDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(STORE_NAME, 'readonly');
                var req = tx.objectStore(STORE_NAME).get(key);
                req.onsuccess = function () { resolve(req.result); };
                req.onerror = function () { reject(req.error); };
            });
        }).catch(function () {
            return undefined;
        });
    }

    function delCache(key) {
        return openDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).delete(key);
                tx.oncomplete = function () { resolve(); };
                tx.onerror = function () { reject(tx.error); };
            });
        }).catch(function () {
            // rien à faire si le cache n'existait pas / n'est pas dispo
        });
    }

    function getDbKey() {
        return 'mars_' + roverValide(roverSelect.value) + '_sol_' + (solValide(solInput.value) || 0);
    }

    var CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h : au-delà, on considère le cache périmé

    function setCacheAvecExpiration(key, photos) {
        return setCache(key, { data: photos, cachedAt: Date.now() });
    }

    async function getCacheValide(key) {
        var entry = await getCache(key);
        if (!entry || !entry.data) return null;
        if (Date.now() - entry.cachedAt > CACHE_TTL_MS) return null; // périmé, on refera un appel réseau
        return entry.data;
    }

    // --- Contrôles de saisie ---
    function setControlsDisabled(disabled) {
        [solMinusBtn, solPlusBtn, searchBtn, clearCacheBtn, roverSelect, solInput, dateInput, modeSolBtn, modeDateBtn]
            .forEach(function (el) { if (el) el.disabled = disabled; });
    }

    function setStatus(text) {
        statusEl.removeAttribute('data-i18n');
        statusEl.textContent = text;
    }

    // --- Bascule entre le mode "Sol" et le mode "Date" ---
    // Un seul champ visible à la fois ; on garde les deux valeurs synchronisées
    // au moment du changement d'onglet, pour que le champ affiché soit toujours à jour.
    function setSearchMode(mode) {
        searchMode = mode;
        var isSol = mode === 'sol';

        modeSolBtn.classList.toggle('active', isSol);
        modeDateBtn.classList.toggle('active', !isSol);
        solModeWrap.hidden = !isSol;
        dateInput.hidden = isSol;
        searchInputLabel.setAttribute('data-i18n', isSol ? 'rovers.solLabel' : 'rovers.dateLabel');
        searchInputLabel.textContent = isSol ? t('rovers.solLabel') : t('rovers.dateLabel');

        if (isSol) {
            var iso = solToEarthDate(roverSelect.value, solInput.value);
            if (iso) dateInput.value = iso;
        } else {
            if (!dateInput.value) {
                var fallback = solToEarthDate(roverSelect.value, solInput.value);
                if (fallback) dateInput.value = fallback;
            }
        }
    }

    // Résout le sol à utiliser à partir du mode actif, et le place dans solInput
    // (source de vérité unique pour la recherche et le cache).
    function resoudreSolActif() {
        if (searchMode === 'date') {
            var isoDate = dateValide(dateInput.value);
            if (!isoDate) return null;
            var sol = earthDateToSol(roverValide(roverSelect.value), isoDate);
            if (sol === null) return null;
            solInput.value = sol;
            return sol;
        }
        return solValide(solInput.value);
    }

    function changerSol(delta) {
        var val = parseInt(solInput.value, 10);
        if (isNaN(val)) val = 0;
        val = Math.max(0, val + delta);
        solInput.value = val;
        chargerDepuisCacheOuReseau();
    }

    function changerRover() {
        galleryEl.innerHTML = '';
        chargerDepuisCacheOuReseau();
    }

    async function chargerDepuisCacheOuReseau() {
        if (chargementEnCours) return;
        var photosEnCache = await getCacheValide(getDbKey());
        if (photosEnCache && photosEnCache.length > 0) {
            setStatus(tf('rovers.cached', { count: photosEnCache.length }));
            afficherGalerie(photosEnCache);
        } else {
            await chargerPhotos();
        }
    }

    async function lancerRecherche() {
        var sol = resoudreSolActif();
        if (sol === null) {
            setStatus(searchMode === 'date' ? t('rovers.invalidDate') : t('rovers.invalidSol'));
            return;
        }
        await chargerPhotos();
    }

    async function chargerPhotos() {
        var rover = roverValide(roverSelect.value);
        var sol = solValide(solInput.value);

        if (sol === null) {
            setStatus(t('rovers.invalidSol'));
            return;
        }

        chargementEnCours = true;
        setControlsDisabled(true);
        setStatus(t('rovers.searchingGeneric'));

        try {
            var category = rover === 'perseverance' ? 'mars2020' : 'msl';
            var jplUrl = 'https://mars.nasa.gov/rss/api/?feed=raw_images&category=' +
                encodeURIComponent(category) + '&feedtype=json&num=100&sol=' + encodeURIComponent(sol);
            var res = await fetch(jplUrl);
            if (!res.ok) throw new Error('Erreur réseau (' + res.status + ')');
            var data = await res.json();
            var rawImages = data.images || [];

            if (rawImages.length === 0) {
                galleryEl.innerHTML = '';
                photosCourantes = [];
                setStatus(tf('rovers.none', { sol: sol }));
                return;
            }

            var photosAStocker = selectionnerPhotos(rawImages, sol);
            await setCacheAvecExpiration(getDbKey(), photosAStocker);
            setStatus(tf('rovers.found', { count: photosAStocker.length, sol: sol }));
            afficherGalerie(photosAStocker);
        } catch (error) {
            console.error(error);
            setStatus(tf('rovers.error', { message: error.message }));
            galleryEl.innerHTML = '';
        } finally {
            chargementEnCours = false;
            setControlsDisabled(false);
        }
    }

    // Sélectionne jusqu'à PHOTOS_PAR_RECHERCHE photos en privilégiant une caméra
    // différente à chaque fois, puis complète avec les images restantes si besoin.
    // Chaque valeur issue de l'API est validée / nettoyée avant d'être conservée.
    function selectionnerPhotos(rawImages, sol) {
        var photos = [];
        var camerasVues = new Set();

        function extraire(img) {
            var camObj = img.camera || {};
            var instrumentBrut = camObj.instrument;
            var instrument = instrumentBrut ? String(instrumentBrut).slice(0, 40) : null;

            var nomBrut = camObj.full_name || camObj.name || instrument || null;
            var cam = nomBrut ? String(nomBrut).slice(0, 80) : null;

            var typeBrut = img.sample_type;
            var sampleType = (typeBrut && String(typeBrut).trim()) ? String(typeBrut).slice(0, 40) : null;

            var creditBrut = img.credit;
            var credit = (creditBrut && String(creditBrut).trim()) ? String(creditBrut).slice(0, 120) : null;

            var url = urlImageValide((img.image_files && (img.image_files.medium || img.image_files.large)) || img.url);
            var dateBrut = img.date_taken_utc ? img.date_taken_utc.split('T')[0] : (img.date_taken || 'N/A');
            var date = dateValide(dateBrut) || 'N/A';
            var id = String(img.id || img.imageid || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60);

            return {
                id: id, camera: cam, instrument: instrument, sampleType: sampleType,
                credit: credit, date: date, sol: sol, url: url
            };
        }

        rawImages.forEach(function (img) {
            if (photos.length >= PHOTOS_PAR_RECHERCHE) return;
            var photo = extraire(img);
            if (photo.url && !camerasVues.has(photo.camera)) {
                camerasVues.add(photo.camera);
                photos.push(photo);
            }
        });

        if (photos.length < PHOTOS_PAR_RECHERCHE) {
            rawImages.forEach(function (img) {
                if (photos.length >= PHOTOS_PAR_RECHERCHE) return;
                var photo = extraire(img);
                if (photo.url && !photos.some(function (p) { return p.url === photo.url; })) {
                    photos.push(photo);
                }
            });
        }

        return photos;
    }

    // Construit chaque carte via les API du DOM (textContent / setAttribute) plutôt
    // que par concaténation de HTML, pour ne jamais interpréter le contenu de l'API
    // comme du balisage.
    function afficherGalerie(photos) {
        photosCourantes = photos;
        galleryEl.innerHTML = '';
        var solLabel = t('rovers.solShort');
        var dateLabel = t('rovers.earthDateLabel');
        var typeLabel = t('rovers.sampleTypeLabel');

        photos.forEach(function (photo, index) {
            var card = document.createElement('button');
            card.type = 'button';
            card.className = 'rover-card';
            card.addEventListener('click', function () { ouvrirPleinEcran(index); });

            var img = document.createElement('img');
            img.src = photo.url;
            img.alt = 'Mars — ' + (photo.camera || t('rovers.unknownCamera'));
            img.loading = 'lazy';

            var body = document.createElement('div');
            body.className = 'rover-card-body';

            var strong = document.createElement('strong');
            strong.textContent = photo.camera || t('rovers.unknownCamera');
            body.appendChild(strong);

            if (photo.instrument && photo.instrument !== photo.camera) {
                var pInstrument = document.createElement('p');
                pInstrument.textContent = photo.instrument;
                body.appendChild(pInstrument);
            }

            var pDate = document.createElement('p');
            pDate.textContent = dateLabel + ' : ' + photo.date;
            body.appendChild(pDate);

            var pSol = document.createElement('p');
            pSol.textContent = solLabel + ' : ' + photo.sol;
            body.appendChild(pSol);

            if (photo.sampleType) {
                var pType = document.createElement('p');
                pType.textContent = typeLabel + ' : ' + photo.sampleType;
                body.appendChild(pType);
            }

            if (photo.credit) {
                var pCredit = document.createElement('p');
                pCredit.textContent = photo.credit;
                body.appendChild(pCredit);
            }

            card.appendChild(img);
            card.appendChild(body);
            galleryEl.appendChild(card);
        });
    }

    // --- Vue plein écran ---
    function focusablesModal() {
        return [modalClose, modalPrev, modalNext].filter(Boolean);
    }

    function ouvrirPleinEcran(index) {
        indexPhotoActive = index;
        dernierElementFocus = document.activeElement;
        mettreAJourModal();
        modal.classList.add('active');
        modalClose.focus();
        document.addEventListener('keydown', gererClavierModal);
    }

    function mettreAJourModal() {
        var photo = photosCourantes[indexPhotoActive];
        if (!photo) return;
        var camera = photo.camera || t('rovers.unknownCamera');
        modalImg.src = photo.url;
        modalImg.alt = camera;
        var legende = camera + ' — ' + t('rovers.solShort') + ' ' + photo.sol +
            ' (' + t('rovers.earthDateLabel') + ' : ' + photo.date + ')';
        if (photo.sampleType) legende += ' — ' + photo.sampleType;
        legende += ' [' + (indexPhotoActive + 1) + '/' + photosCourantes.length + ']';
        modalCaption.textContent = legende;
    }

    function photoPrecedente() {
        if (photosCourantes.length === 0) return;
        indexPhotoActive = (indexPhotoActive - 1 + photosCourantes.length) % photosCourantes.length;
        mettreAJourModal();
    }

    function photoSuivante() {
        if (photosCourantes.length === 0) return;
        indexPhotoActive = (indexPhotoActive + 1) % photosCourantes.length;
        mettreAJourModal();
    }

    function fermerPleinEcran() {
        modal.classList.remove('active');
        document.removeEventListener('keydown', gererClavierModal);
        if (dernierElementFocus && typeof dernierElementFocus.focus === 'function') {
            dernierElementFocus.focus();
        }
    }

    function gererClavierModal(e) {
        if (e.key === 'Escape') { fermerPleinEcran(); return; }
        if (e.key === 'ArrowLeft') { photoPrecedente(); return; }
        if (e.key === 'ArrowRight') { photoSuivante(); return; }
        if (e.key === 'Tab') {
            var items = focusablesModal();
            var currentIndex = items.indexOf(document.activeElement);
            var nextIndex;
            if (e.shiftKey) {
                nextIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
            } else {
                nextIndex = currentIndex === -1 || currentIndex === items.length - 1 ? 0 : currentIndex + 1;
            }
            items[nextIndex].focus();
            e.preventDefault();
        }
    }

    async function viderCache() {
        await delCache(getDbKey());
        galleryEl.innerHTML = '';
        photosCourantes = [];
        setStatus(t('rovers.cacheCleared'));
    }

    // --- Initialisation ---
    function initDateInputBounds() {
        var today = new Date().toISOString().split('T')[0];
        dateInput.max = today;
    }

    modeSolBtn.addEventListener('click', function () { setSearchMode('sol'); });
    modeDateBtn.addEventListener('click', function () { setSearchMode('date'); });
    solMinusBtn.addEventListener('click', function () { changerSol(-1); });
    solPlusBtn.addEventListener('click', function () { changerSol(1); });
    solInput.addEventListener('change', chargerDepuisCacheOuReseau);
    roverSelect.addEventListener('change', changerRover);
    searchBtn.addEventListener('click', lancerRecherche);
    clearCacheBtn.addEventListener('click', viderCache);
    modalClose.addEventListener('click', fermerPleinEcran);
    modalPrev.addEventListener('click', photoPrecedente);
    modalNext.addEventListener('click', photoSuivante);
    modal.addEventListener('click', function (e) {
        if (e.target === modal) fermerPleinEcran();
    });

    // Retraduit la galerie, la légende de la modale et le libellé du champ actif
    // sans relancer de requête réseau
    document.addEventListener('langchange', function () {
        searchInputLabel.textContent = t(searchMode === 'sol' ? 'rovers.solLabel' : 'rovers.dateLabel');
        if (photosCourantes.length > 0) {
            afficherGalerie(photosCourantes);
            if (modal.classList.contains('active')) mettreAJourModal();
        }
    });

    initDateInputBounds();
    setSearchMode('sol');
    changerRover();
})();