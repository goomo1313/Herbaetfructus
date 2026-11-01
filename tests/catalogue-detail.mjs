import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script, createContext, runInContext } from 'node:vm';
import test from 'node:test';

const html = readFileSync('index.html', 'utf8');
const catalogueCode = readFileSync('catalogue-ui.js', 'utf8');
const catalogueCss = readFileSync('catalogue-ui.css', 'utf8');
const inlineCode = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1]).filter(Boolean).join('\n');

function element() {
    const attributes = {};
    const listeners = {};
    const classes = new Set();
    return {
        dataset: {}, style: {}, innerHTML: '', textContent: '', value: '', max: '',
        disabled: false, children: [], attrs: attributes, listeners,
        classList: {
            add(name) { classes.add(name); },
            remove(name) { classes.delete(name); },
            contains(name) { return classes.has(name); },
            toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); }
        },
        setAttribute(name, value) { attributes[name] = value; },
        getAttribute(name) { return attributes[name]; },
        appendChild(child) { this.children.push(child); return child; },
        querySelectorAll() { return this.children; },
        addEventListener(name, fn) { listeners[name] = fn; },
        focus() {}
    };
}

function site() {
    const controls = new Map();
    for (const id of ['productDetailOverlay','detailHero','detailThumbs','detailCategory',
        'detailTitle','detailDescription','detailProperties','detailPrice','detailAvailability',
        'detailQuantity','detailAdd','detailOrder','detailShare','detailClose']) {
        controls.set(id, element());
    }
    const document = {
        body: {classList: {contains() { return false; }}},
        activeElement: element(),
        getElementById(id) { return controls.get(id) || null; },
        createElement() { return element(); },
        addEventListener() {}
    };
    const window = {
        HERBA_CONFIG: {}, location: {hash: '', pathname: '/Herbaetfructus/', search: '', href: 'https://example.org/Herbaetfructus/'},
        history: {pushState() {}, replaceState() {}},
        addEventListener() {}
    };
    const vm = createContext({
        window, document, console: {warn() {},error() {},info() {}},
        localStorage: {getItem() {return null;}}, setTimeout() {}
    });
    runInContext(inlineCode, vm);
    runInContext(catalogueCode, vm);
    return {vm, controls, window};
}

test('detail code and HTML have correct modal structure and links', () => {
    assert.doesNotThrow(() => new Script(catalogueCode));
    assert.match(catalogueCss, /\.product-detail-layout/);
    assert.match(html, /id="productDetailOverlay"/);
    assert.match(html, /src="\.\/catalogue-ui\.js"/);
    assert.match(html, /href="\.\/catalogue-ui\.css"/);
    assert.match(html, /class="variety-more"/);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(ids.length, new Set(ids).size, 'Static element IDs must be unique');
});

test('photo gallery contains only distinct HTTPS photos', () => {
    const {vm} = site();
    const images = runInContext(
        "window.HERBA_CATALOGUE.imagesFor({img:'https://a.example/img.jpg',gallery:['http://invalid','javascript:alert(1)','https://a.example/img.jpg','https://b.example/rez.jpg']})",
        vm
    );
    assert.deepEqual(Array.from(images), ['https://a.example/img.jpg','https://b.example/rez.jpg']);
    assert.equal(runInContext("window.HERBA_CATALOGUE.imagesFor({img:''}).length", vm), 0);
});

test('the product detail opens even when photography is missing', () => {
    const {vm, controls} = site();
    const name = runInContext('varietyDatabase[0].name',vm);
    const opened = vm.window.HERBA_CATALOGUE.open(name, true);
    assert.equal(opened, true);
    assert.equal(controls.get('detailTitle').textContent, name);
    assert.equal(controls.get('productDetailOverlay').classList.contains('active'), true);
    assert.match(controls.get('detailProperties').innerHTML, /Obsah balenia/);
    assert.match(controls.get('detailHero').innerHTML, /Fotografiu tejto odrody pripravujeme/);
    assert.equal(controls.get('detailQuantity').max, '2');
    assert.equal(controls.get('detailAdd').disabled, false);
    vm.window.HERBA_CATALOGUE.close(false);
    assert.equal(controls.get('productDetailOverlay').classList.contains('active'), false);
});

test('hidden varieties are not publicly opened; out-of-stock varieties cannot be added', () => {
    const {vm, controls} = site();
    runInContext("varietyDatabase[0].hidden = true;",vm);
    const name = runInContext('varietyDatabase[0].name',vm);
    assert.equal(vm.window.HERBA_CATALOGUE.open(name, true), false);
    runInContext("varietyDatabase[0].hidden = false; varietyDatabase[0].stock = 0;",vm);
    assert.equal(vm.window.HERBA_CATALOGUE.open(name, true), true);
    assert.equal(controls.get('detailAdd').disabled,true);
    assert.equal(controls.get('detailQuantity').disabled,true);
});

test('admin photo fields and cloud upload have size and type guards', async () => {
    const {vm} = site();
    assert.match(html, /id="varGalleryUrls"/);
    assert.match(html, /id="varPhotoFiles"/);
    assert.match(html, /id="varPhotoUploadStatus"/);
    assert.match(html, /storage\.from\('site-images'\)\.upload/);
    assert.match(html, /async function prepareVarietyPhoto\(file\)/);
    const basic = {size: 1_000_000, type:'image/jpeg'};
    const result = await runInContext('prepareVarietyPhoto',vm)(basic);
    assert.equal(result,basic);
    await assert.rejects(runInContext('prepareVarietyPhoto',vm)({size:1200,type:'text/html'}),/JPG, PNG alebo WebP/);
    await assert.rejects(runInContext('prepareVarietyPhoto',vm)({size:21_000_000,type:'image/jpeg'}),/20 MB/);
});

test('stock and pack sizes are never changed by opening detail', () => {
    const {vm} = site();
    const before = runInContext("varietyDatabase.map(v => ({name:v.name,price:v.price,stock:v.stock,seeds:v.seedsPerPack}))",vm);
    vm.window.HERBA_CATALOGUE.open(before[0].name,true);
    const after = runInContext("varietyDatabase.map(v => ({name:v.name,price:v.price,stock:v.stock,seeds:v.seedsPerPack}))",vm);
    assert.deepEqual(Array.from(after, v => ({...v})),Array.from(before, v => ({...v})));
});

test('catalogue and story photos fit fully without clipping', () => {
    const catalogueStyle = html.match(/\.card-img-placeholder img\s*\{([^}]+)\}/);
    assert.ok(catalogueStyle, 'The product photo style must exist');
    assert.match(catalogueStyle[1], /object-fit:\s*contain\s*;/);
    assert.match(catalogueStyle[1], /object-position:\s*center center\s*;/);
    assert.ok(!html.includes('.card-img-placeholder:hover img { transform: scale(1.05); }'),
        'Hover zoom would clip the fitted photo again');

    const storyStyle = html.match(/\.home-story-media img\s*\{([^}]+)\}/);
    assert.ok(storyStyle);
    assert.match(storyStyle[1], /object-fit:\s*contain\s*;/);
});

test('fitting can be configured separately for the main and gallery photos', () => {
    const {vm} = site();
    const fitFor = vm.window.HERBA_CATALOGUE.fitFor;
    const item = {
        img: 'https://example.org/main.jpg',
        imageFit: 'cover',
        gallery: ['https://example.org/rez.jpg', 'https://example.org/plant.jpg'],
        galleryImageFits: {
            'https://example.org/rez.jpg': 'contain',
            'https://example.org/plant.jpg': 'cover'
        }
    };
    assert.equal(fitFor(item, item.img), 'cover');
    assert.equal(fitFor(item, item.gallery[0]), 'contain');
    assert.equal(fitFor(item, item.gallery[1]), 'cover');
    assert.equal(fitFor({...item, imageFit: undefined}, item.img), 'contain');
    assert.equal(fitFor({...item, galleryImageFits: {}}, item.gallery[1]), 'contain');
    assert.equal(runInContext("normalizedImageFit('not-a-valid-fit')", vm), 'contain');
});

test('the detailed photo gallery obeys each saved fit setting when changing images', () => {
    const {vm, controls} = site();
    runInContext(
        "varietyDatabase[0].img = 'https://images.example/main.jpg';"+
        "varietyDatabase[0].imageFit = 'cover';"+
        "varietyDatabase[0].gallery = ['https://images.example/inside.jpg', 'https://images.example/on-plant.jpg'];"+
        "varietyDatabase[0].galleryImageFits = {"+
            "'https://images.example/inside.jpg': 'contain',"+
            "'https://images.example/on-plant.jpg': 'cover'"+
        "};",
        vm
    );
    const name = runInContext('varietyDatabase[0].name',vm);
    assert.equal(vm.window.HERBA_CATALOGUE.open(name, true), true);
    const hero = controls.get('detailHero');
    const thumbs = controls.get('detailThumbs').children;
    assert.equal(thumbs.length, 3);
    assert.equal(hero.children.at(-1).style.objectFit, 'cover');
    thumbs[1].listeners.click();
    assert.equal(hero.children.at(-1).style.objectFit, 'contain');
    assert.equal(thumbs[1].attrs['aria-pressed'], 'true');
    thumbs[2].listeners.click();
    assert.equal(hero.children.at(-1).style.objectFit, 'cover');
});

test('photo-fit selections are available in the admin and written to Supabase datasets', () => {
    for (const id of ['varImageFit','varGalleryFitControls','secImageFit',
        'varMainPhotoPreview','secImageFitPreview']) {
        assert.ok(html.includes('id="' + id + '"'), 'Missing admin control ' + id);
    }
    assert.match(html, /const galleryImageFits = Object\.fromEntries\(/);
    assert.match(html, /stock, weight, img, imageFit, gallery, galleryImageFits/);
    assert.match(html, /const updated = \{ id, name, desc, content, image, imagePosition, imageFit, imageAlt \}/);
    assert.match(html, /normalizedImageFit\(t\.imageFit\)/);
    assert.match(html, /<img src="\$\{escapeHtml\(t\.img\)\}"[^>]+style="object-fit:\$\{normalizedImageFit\(t\.imageFit\)\}"/);
    assert.match(html, /story-image-cover/);
    assert.match(html, /Zobraziť celú – bez orezania/);
    assert.match(html, /Vyplniť rámik – možné orezanie okrajov/);
});


test('paused inquiry form disables order controls in the individual product detail', () => {
    const {vm, controls} = site();
    runInContext("farmSettings.orderFormPaused = true", vm);
    const name = runInContext('varietyDatabase[0].name', vm);
    assert.equal(vm.window.HERBA_CATALOGUE.open(name, true), true,
        'Visitors can still read product information while the form is paused');
    assert.equal(controls.get('detailAdd').disabled, true);
    assert.equal(controls.get('detailOrder').disabled, true);
    assert.equal(controls.get('detailQuantity').disabled, true);
    assert.match(controls.get('detailAvailability').textContent, /pozastavené/);
    const addListener = controls.get('detailAdd').listeners.click;
    const orderListener = controls.get('detailOrder').listeners.click;
    assert.doesNotThrow(() => addListener());
    assert.doesNotThrow(() => orderListener());
    assert.equal(controls.get('productDetailOverlay').classList.contains('active'), true);
    runInContext("farmSettings.orderFormPaused = false", vm);
    assert.equal(vm.window.HERBA_CATALOGUE.open(name, true), true);
    assert.equal(controls.get('detailAdd').disabled, false);
    assert.equal(controls.get('detailOrder').disabled, false);
});
