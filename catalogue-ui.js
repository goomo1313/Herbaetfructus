/* Herba et Fructus – galéria a detail odrody. Bez obrázkov z externých fotobánk. */
(() => {
    'use strict';
    let activeName = null;
    let previousFocus = null;

    const byId = id => document.getElementById(id);
    const isAdmin = () => document.body.classList.contains('admin-mode');
    const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));

    function currentVariety(name) {
        return varietyDatabase.find(item => item && item.name === name);
    }

    function imagesFor(item) {
        if (!item) return [];
        const entries = [item.img].concat(Array.isArray(item.gallery) ? item.gallery : []);
        const urls = entries.map(value => typeof value === 'string' ? value.trim() : '')
            .filter(url => /^https:\/\//i.test(url));
        return [...new Set(urls)].slice(0, 8);
    }

    function fitFor(item, url) {
        if (!item) return 'contain';
        if (url === item.img) return item.imageFit === 'cover' ? 'cover' : 'contain';
        const galleryFits = item.galleryImageFits && typeof item.galleryImageFits === 'object'
            ? item.galleryImageFits : {};
        return galleryFits[url] === 'cover' ? 'cover' : 'contain';
    }

    function selectPhoto(url, label, fit = 'contain') {
        const hero = byId('detailHero');
        const thumbs = byId('detailThumbs');
        if (!hero || !thumbs) return;
        hero.textContent = '';
        const photo = document.createElement('img');
        photo.src = url;
        photo.alt = label;
        photo.style.objectFit = fit === 'cover' ? 'cover' : 'contain';
        hero.appendChild(photo);
        for (const thumb of thumbs.querySelectorAll('button')) {
            thumb.setAttribute('aria-pressed', String(thumb.dataset.url === url));
        }
    }

    function displayPhotos(item) {
        const hero = byId('detailHero');
        const thumbs = byId('detailThumbs');
        if (!hero || !thumbs) return;
        hero.textContent = '';
        thumbs.textContent = '';
        const urls = imagesFor(item);
        if (!urls.length) {
            hero.innerHTML = '<div class="product-detail-placeholder"><span aria-hidden="true">🌱</span>' +
                '<strong>Fotografiu tejto odrody pripravujeme</strong>' +
                '<small>V katalógu používame len fotografie s jasným pôvodom, nie ilustračné zábery inej odrody.</small></div>';
            return;
        }
        for (const [index, url] of urls.entries()) {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.url = url;
            button.setAttribute('aria-pressed', String(index === 0));
            button.setAttribute('aria-label', 'Zobraziť fotografiu ' + (index + 1) + ' odrody ' + item.name);
            const image = document.createElement('img');
            image.src = url;
            image.alt = '';
            image.loading = 'lazy';
            image.style.objectFit = fitFor(item, url);
            button.appendChild(image);
            button.addEventListener('click', () =>
                selectPhoto(url, item.name + ' – fotografia ' + (index + 1), fitFor(item, url)));
            thumbs.appendChild(button);
        }
        selectPhoto(urls[0], item.name + ' – fotografia 1', fitFor(item, urls[0]));
    }

    function open(name, withoutHistory = false) {
        const item = currentVariety(name);
        if (!item || (item.hidden && !isAdmin())) return false;
        const overlay = byId('productDetailOverlay');
        if (!overlay) return false;
        if (!activeName) previousFocus = document.activeElement;
        activeName = item.name;
        const stock = Math.max(0, Math.floor(Number(item.stock) || 0));
        const soldOut = stock === 0 || !!item.hidden;
        byId('detailTitle').textContent = item.name;
        byId('detailCategory').textContent = item.section === 'tekvice' ? 'Tekvice a cukety' : 'Zberateľské odrody paradajok';
        byId('detailDescription').textContent = item.info || 'Podrobnejší opis odrody doplníme podľa dostupných podkladov.';
        const props = [
            ['Typ / pomológia', item.type],
            ['Farba plodu', item.color],
            ['Priemerná hmotnosť plodu', item.weight],
            ['Obsah balenia', item.seedsPerPack || '10 ks']
        ];
        byId('detailProperties').innerHTML = props
            .filter(entry => String(entry[1] || '').trim())
            .map(entry => '<div><dt>' + esc(entry[0]) + '</dt><dd>' + esc(entry[1]) + '</dd></div>')
            .join('');
        const price = String(item.price || '').trim();
        byId('detailPrice').textContent = price ? (price.includes('€') ? price : price + ' €') : 'Cena na vyžiadanie';
        byId('detailAvailability').textContent = item.hidden ? 'Momentálne nedostupné' :
            stock ? 'Na sklade: ' + stock + ' bal.' : 'Momentálne vypredané';
        byId('detailAvailability').classList.toggle('out', soldOut);
        const qty = byId('detailQuantity');
        qty.max = String(Math.max(1, stock));
        qty.value = '1';
        qty.disabled = soldOut;
        byId('detailAdd').disabled = soldOut;
        displayPhotos(item);
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');
        byId('detailClose').focus();
        if (!withoutHistory) {
            const hash = '#odroda=' + encodeURIComponent(item.name);
            if (window.location.hash !== hash) {
                window.history.pushState({herbaVariety: item.name}, '', hash);
            }
        }
        return true;
    }

    function close(updateUrl = true) {
        const overlay = byId('productDetailOverlay');
        if (overlay) {
            overlay.classList.remove('active');
            overlay.setAttribute('aria-hidden', 'true');
        }
        activeName = null;
        if (updateUrl && window.location.hash.startsWith('#odroda=')) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
        previousFocus = null;
    }

    function routeFromHash() {
        const hash = window.location.hash || '';
        if (!hash.startsWith('#odroda=')) {
            if (activeName) close(false);
            return;
        }
        let name;
        try { name = decodeURIComponent(hash.slice('#odroda='.length)); }
        catch (error) { return; }
        const item = currentVariety(name);
        if (!item || (item.hidden && !isAdmin())) return;
        if (currentActiveSection !== item.section && typeof switchSection === 'function') {
            switchSection(item.section);
        }
        open(name, true);
    }

    function addFromDetail() {
        const item = currentVariety(activeName);
        if (!item || item.hidden) return;
        const quantity = Number.parseInt(byId('detailQuantity').value, 10) || 1;
        if (typeof addVarietyQuantityToForm === 'function') {
            addVarietyQuantityToForm(item.name, quantity);
        }
    }

    function order() {
        const item = currentVariety(activeName);
        if (!item) return;
        close();
        if (typeof switchSection === 'function') switchSection(item.section);
        byId('kontaktSection')?.scrollIntoView({behavior: 'smooth', block: 'start'});
    }

    async function copyLink() {
        if (!activeName) return;
        const url = new URL(window.location.href);
        url.hash = 'odroda=' + encodeURIComponent(activeName);
        try {
            if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
            await navigator.clipboard.writeText(url.href);
            if (typeof showToast === 'function') showToast('🔗 Odkaz na odrodu skopírovaný.');
        } catch (error) {
            window.prompt('Skopíruj odkaz na odrodu:', url.href);
        }
    }

    const overlay = byId('productDetailOverlay');
    if (overlay) {
        byId('detailClose').addEventListener('click', () => close());
        byId('detailAdd').addEventListener('click', addFromDetail);
        byId('detailOrder').addEventListener('click', order);
        byId('detailShare').addEventListener('click', copyLink);
        overlay.addEventListener('click', event => {
            if (event.target === overlay) close();
        });
        document.addEventListener('keydown', event => {
            if (!overlay.classList.contains('active')) return;
            if (event.key === 'Escape') close();
            if (event.key === 'Tab') {
                const focusable = [...overlay.querySelectorAll('button:not(:disabled), input:not(:disabled)')];
                if (!focusable.length) return;
                const first = focusable[0], last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        });
        window.addEventListener('popstate', routeFromHash);
        window.addEventListener('hashchange', routeFromHash);
    }

    window.HERBA_CATALOGUE = { open, close, routeFromHash, imagesFor, fitFor };
})();
