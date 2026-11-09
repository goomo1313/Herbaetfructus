import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext, Script } from 'node:vm';
import test from 'node:test';

const html = readFileSync('index.html', 'utf8');
const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1]).filter(Boolean).join('\n');

function buildPage() {
    const hero = { hidden: false };
    const contact = {style: {display: ''}};
    const conditions = {style: {display: ''}};
    const calendar = {style: {display: ''}};
    const nav = {innerHTML: '', children: [], appendChild(item) {this.children.push(item);}};
    const controls = {
        homeHero: hero,
        mainNavLinks: nav,
        kontaktSection: contact,
        podmienkySection: conditions,
        gardenCalendarSection: calendar
    };
    const document = {
        addEventListener() {},
        getElementById(id) {return controls[id] || null;},
        querySelector() {return null;},
        querySelectorAll() {return [];},
        createElement() {
            return {classList: {add() {}, toggle() {}}, appendChild() {}, style: {}};
        },
        body: {classList: {contains() {return false;}}}
    };
    const context = createContext({
        window: {HERBA_CONFIG: {}, scrollTo() {}},
        document,
        localStorage: {getItem() {return null;}},
        console: {info() {}, warn() {}, error() {}},
        setTimeout() {}
    });
    runInContext(inline, context);
    return {context, hero};
}

test('zelený úvod má vlastný identifikátor a pravidlo pre skrytie', () => {
    assert.doesNotThrow(() => new Script(inline));
    assert.match(html, /class="hero" id="homeHero"/);
    assert.match(html, /\.hero\[hidden\] \{ display: none !important; \}/);
});

test('zelený úvod sa ukazuje iba na Náš príbeh, nie v katalógu, blogu ani kalendári', () => {
    const {context, hero} = buildPage();
    runInContext('updateHomeHeroVisibility()', context);
    assert.equal(hero.hidden, false, 'domov je úvodná viditeľná sekcia');
    for (const page of ['paradajky', 'tekvice', 'blog', 'kalendar', 'podmienky']) {
        runInContext('switchSection('+JSON.stringify(page)+')',context);
        assert.equal(hero.hidden, true, 'Úvod musí byť skrytý v sekcii '+page);
    }
    runInContext("switchSection('domov')",context);
    assert.equal(hero.hidden, false, 'Náš príbeh znovu ukáže úvod');
});

test('obnovenie celého vykreslenia nevráti zelený úvod do iných sekcií', () => {
    const {context, hero} = buildPage();
    runInContext('renderMainContent=()=>{}; renderFormTomatoCheckboxes=()=>{}; updateFormAction=()=>{};',context);
    runInContext("switchSection('blog'); renderAll();",context);
    assert.equal(hero.hidden, true);
    runInContext("switchSection('domov'); renderAll();",context);
    assert.equal(hero.hidden, false);
});

test('zmeny príbehu neodstránili spoločné administračné nastavenie cien a formulára', () => {
    assert.match(html, /id="openVisibilitySettingsBtn"/);
    assert.match(html, /id="togglePricesBtn"/);
    assert.match(html, /id="toggleOrderFormBtn"/);
    assert.match(html, /return farmSettings\.pricesHidden === true/);
});
