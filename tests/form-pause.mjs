import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext, Script } from 'node:vm';
import test from 'node:test';

const html = readFileSync('index.html', 'utf8');
const appScript = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1]).filter(Boolean).join('\n');

function environment() {
    const alerts = [];
    const toastMessages = [];
    const controls = {
        kontaktSection: { style: { display: 'none' } },
        floatingCounter: { style: { display: 'flex' } },
        toggleOrderFormBtn: {
            textContent: '', style: {}, disabled: false, attrs: {},
            setAttribute(name, value) { this.attrs[name] = value; }
        },
        submit: { disabled: false }
    };
    const document = {
        addEventListener() {},
        querySelectorAll() { return []; },
        querySelector(selector) {
            return selector === '#contactForm button[type="submit"]' ? controls.submit : null;
        },
        getElementById(id) { return controls[id] || null; },
        body: { classList: { contains() { return false; } } }
    };
    const context = createContext({
        document, window: { HERBA_CONFIG: {} },
        console: {warn() {}, error() {}, info() {}},
        localStorage: {getItem() { return null; }},
        setTimeout() {},
        alert(message) { alerts.push(message); }
    });
    runInContext(appScript, context);
    runInContext('showToast = function(message) { window.__toast.push(message); }', context);
    context.window.__toast = toastMessages;
    return {context, controls, alerts, toastMessages};
}

test('admin control is available and public form is initially hidden before cloud loads', () => {
    assert.doesNotThrow(() => new Script(appScript));
    assert.match(html, /id="toggleOrderFormBtn"/);
    assert.match(html, /onclick="toggleOrderFormPaused\(\)"/);
    assert.match(html, /id="kontaktSection"[^>]*display: none/);
    const {context} = environment();
    assert.equal(runInContext('isOrderFormPaused()', context), false);
});

test('paused settings hide the form and selection shortcut across all sections', () => {
    const {context, controls} = environment();
    runInContext("currentActiveSection = 'paradajky'; updateOrderFormVisibility()", context);
    assert.equal(controls.kontaktSection.style.display, 'block');
    assert.equal(controls.submit.disabled, false);
    assert.equal(controls.toggleOrderFormBtn.attrs['aria-pressed'], 'false');
    runInContext("farmSettings.orderFormPaused = true; updateOrderFormVisibility()", context);
    assert.equal(controls.kontaktSection.style.display, 'none');
    assert.equal(controls.submit.disabled, true);
    assert.equal(controls.floatingCounter.style.display, 'none');
    assert.equal(controls.toggleOrderFormBtn.attrs['aria-pressed'], 'true');
    assert.match(controls.toggleOrderFormBtn.textContent, /Obnoviť formulár/);
    runInContext("farmSettings.orderFormPaused = false; updateOrderFormVisibility()", context);
    assert.equal(controls.kontaktSection.style.display, 'block');
    assert.match(controls.toggleOrderFormBtn.textContent, /Pozastaviť formulár/);
    runInContext("currentActiveSection = 'domov'; updateOrderFormVisibility()", context);
    assert.equal(controls.kontaktSection.style.display, 'none');
});

test('submitting during a pause is blocked before email and stock validation', () => {
    const {context, alerts} = environment();
    runInContext('farmSettings.orderFormPaused = true', context);
    const submit = runInContext('handleFormSubmit', context);
    const event = {prevented: false, preventDefault() { this.prevented = true; }};
    assert.equal(submit(event), false);
    assert.equal(event.prevented, true);
    assert.ok(alerts.some(message => message.includes('pozastavený')));
});

test('paused catalogue cannot add items or reopen the form by shortcut', () => {
    const {context, toastMessages} = environment();
    runInContext('farmSettings.orderFormPaused = true', context);
    const result = runInContext("addVarietyQuantityToForm('Black Strawberry', 2)", context);
    assert.equal(result, false);
    runInContext('openOrderForm()', context);
    assert.ok(toastMessages.some(message => message.includes('pozastavené')));
    assert.match(html, /isOrderFormPaused\(\) \? '<div class="form-pause-note"/);
});

test('admin pause is saved online before its visible state changes', async () => {
    const {context, controls} = environment();
    context.window.__saved = [];
    runInContext(
        "adminAuthenticated = true; cloudDatabaseReady = true; currentActiveSection = 'paradajky';" +
        "farmSettings.email = 'owner@example.com';" +
        "queueCloudSave = async function(key, snapshot) { window.__saved.push({key, snapshot}); return true; };" +
        "renderAll = function() { updateOrderFormVisibility(); };",
        context
    );
    assert.equal(await runInContext('toggleOrderFormPaused()', context), true);
    assert.equal(runInContext('farmSettings.orderFormPaused', context), true);
    assert.equal(runInContext('farmSettings.email', context), 'owner@example.com');
    assert.equal(context.window.__saved.length, 1);
    assert.equal(context.window.__saved[0].key, 'settings');
    assert.equal(context.window.__saved[0].snapshot.orderFormPaused, true);
    assert.equal(controls.kontaktSection.style.display, 'none');
    assert.equal(controls.toggleOrderFormBtn.disabled, false);

    assert.equal(await runInContext('toggleOrderFormPaused()', context), true);
    assert.equal(runInContext('farmSettings.orderFormPaused', context), false);
    assert.equal(context.window.__saved[1].snapshot.orderFormPaused, false);
    assert.equal(controls.kontaktSection.style.display, 'block');
});

test('failed cloud save leaves previous pause setting unchanged', async () => {
    const {context, controls, alerts} = environment();
    runInContext(
        "adminAuthenticated = true; cloudDatabaseReady = true;" +
        "farmSettings.orderFormPaused = true; " +
        "queueCloudSave = async function() { return false; };",
        context
    );
    assert.equal(await runInContext('toggleOrderFormPaused()', context), false);
    assert.equal(runInContext('farmSettings.orderFormPaused', context), true);
    assert.equal(controls.toggleOrderFormBtn.disabled, false);
    assert.ok(alerts.some(message => message.includes('nepodarilo uložiť')));
});

test('without a valid cloud connection or admin, changing visibility is rejected', async () => {
    const {context, alerts} = environment();
    assert.equal(await runInContext('toggleOrderFormPaused()', context), false);
    runInContext('adminAuthenticated = true; cloudDatabaseReady = false', context);
    assert.equal(await runInContext('toggleOrderFormPaused()', context), false);
    assert.ok(alerts.some(message => message.includes('Databáza Supabase')));
});
