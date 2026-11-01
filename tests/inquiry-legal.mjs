import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext, Script } from 'node:vm';

const html = readFileSync('index.html', 'utf8');
const confirmation = readFileSync('dakujeme.html', 'utf8');
const legalNotes = readFileSync('PRAVNE_OVERENIE_PRE_SPRAVCU.md', 'utf8');
const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1]).filter(Boolean).join('\n');

function site() {
    const firstCheck = {
        value: 'Black Strawberry', checked: true, disabled: false, dataset: {price: '2'}
    };
    const qtyInput = {value: '1', dataset: {max: '2'}};
    const selectorItems = [{
        querySelector(selector) {
            if (selector.includes('checkbox')) return firstCheck;
            if (selector.includes('form-qty-input')) return qtyInput;
            return null;
        }
    }];
    const counter = {
        style: {display: 'none'},
        querySelector(selector) {
            if (selector === '.count') return {set innerText(value) {this.value = value;}};
            if (selector === '.totalPrice') return {set innerText(value) {this.value = value;}};
            return null;
        }
    };
    const controls = {
        floatingCounter: counter,
        cartSummaryContent: {innerHTML: ''},
        orderSummary: {value: ''}
    };
    const document = {
        getElementById(id) {return controls[id] || null;},
        querySelectorAll(selector) {
            if (selector === '#formTomatoSelector .selector-item') return selectorItems;
            return [];
        },
        addEventListener() {},
        body: {classList: {contains() {return false;}}}
    };
    const context = createContext({
        document, window: {HERBA_CONFIG: {}},
        localStorage: {getItem() {return null;}},
        console: {warn() {},error() {},info() {}},
        setTimeout() {}
    });
    runInContext(script, context);
    return {context, firstCheck, qtyInput, controls};
}

test('selection summary is first, full selector is optional and closed initially', () => {
    const summary = html.indexOf('id="cartSummaryBox"');
    const editor = html.indexOf('id="formSelectionEditor"');
    assert.ok(summary > 0 && editor > summary);
    assert.match(html, /<details class="form-accordion form-selection-edit" id="formSelectionEditor">/);
    assert.ok(!html.includes('<details class="form-accordion" open>'));
    assert.match(html, /id="formTomatoSelector"/);
    assert.match(html, /Vrátiť sa do katalógu paradajok/);
});

test('simple inquiry requests only minimal personal data and no early payment', () => {
    assert.doesNotMatch(html, /id="adresa"/);
    assert.doesNotMatch(html, /name="sposob_platby"/);
    assert.doesNotMatch(html, /id="gdprConsent"/);
    assert.match(html, /<input type="email" id="email" name="email" required/);
    assert.match(html, /<input type="text" id="meno" name="meno" required/);
    assert.match(html, /Odoslať nezáväzný dopyt/);
    assert.match(html, /Údaje sa prenášajú cez službu FormSubmit/);
});

test('cart quantity and deletion update the selected list and hidden form field', () => {
    assert.doesNotThrow(() => new Script(script));
    const {context, firstCheck, qtyInput, controls} = site();
    runInContext('updateSelectionCounter()',context);
    assert.match(controls.cartSummaryContent.innerHTML, /Black Strawberry/);
    assert.match(controls.cartSummaryContent.innerHTML, /changeSummaryQty\(0, -1\)/);
    assert.match(controls.cartSummaryContent.innerHTML, /removeSummaryVariety\(0\)/);
    assert.match(controls.orderSummary.value, /1 bal./);
    runInContext('changeSummaryQty(0, 1)',context);
    assert.equal(qtyInput.value,2);
    assert.match(controls.orderSummary.value, /2 bal./);
    runInContext('changeSummaryQty(0, 1)',context);
    assert.equal(qtyInput.value,2);
    runInContext('changeSummaryQty(0, -1)',context);
    assert.equal(qtyInput.value,1);
    runInContext('removeSummaryVariety(0)',context);
    assert.equal(firstCheck.checked,false);
    assert.equal(controls.orderSummary.value,'Bez výberu odrôd');
    assert.match(controls.cartSummaryContent.innerHTML,/Zatiaľ nemáte vybrané žiadne odrody/);
});

test('site does not promise a collector-seed sales exemption', () => {
    assert.match(html, /nepredstavuje samostatné zákonné povolenie/);
    assert.match(html, /nariadenie vlády SR č\. 58\/2007 Z\. z\./);
    assert.match(html, /nezáväzný dopyt/);
    assert.match(legalNotes, /nie právne stanovisko/);
    assert.match(legalNotes, /500 € ročne/);
    assert.match(legalNotes, /ÚKSÚP/);
    assert.match(legalNotes, /zberateľské/);
});

test('after submitting, FormSubmit redirects to a real non-binding confirmation page', () => {
    assert.match(html, /new URL\('\.\/dakujeme\.html', window\.location\.href\)\.href/);
    assert.match(confirmation, /<title>Ďakujeme za dopyt \| Herba et Fructus<\/title>/);
    assert.match(confirmation, /nejde|nie|Nezáväzný|nezáväzný/);
    assert.match(confirmation, /href="\.\/index\.html"/);
    assert.equal(new URL('./dakujeme.html','https://goomo1313.github.io/Herbaetfructus/').pathname,
        '/Herbaetfructus/dakujeme.html');
    assert.equal(new URL('./dakujeme.html','https://example.org/other/path/index.html').pathname,
        '/other/path/dakujeme.html');
});
