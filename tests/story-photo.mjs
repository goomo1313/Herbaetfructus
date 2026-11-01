import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createContext, runInContext, Script } from 'node:vm';

const html = readFileSync('index.html', 'utf8');
const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(result => result[1]).filter(Boolean).join('\n');
const photoPath = 'assets/nas-pribeh-paradajky.jpg';

function makeSite() {
    const document = {
        getElementById() { return null; },
        addEventListener() {},
        querySelectorAll() { return []; },
        body: { classList: { contains() { return false; } } }
    };
    const context = createContext({
        window: { HERBA_CONFIG: {} }, document,
        console: { error() {}, info() {}, warn() {} },
        localStorage: { getItem() { return null; } },
        setTimeout() {}
    });
    runInContext(script, context);
    return context;
}

test('authentic story photograph exists as a reasonably sized JPEG in repository', () => {
    const bytes = readFileSync(photoPath);
    assert.ok(statSync(photoPath).size > 40_000, 'The story photo should not be a tiny placeholder');
    assert.ok(statSync(photoPath).size < 350_000, 'Story image should be web-optimized');
    assert.equal(bytes[0], 0xff);
    assert.equal(bytes[1], 0xd8);
    assert.equal(bytes.at(-2), 0xff);
    assert.equal(bytes.at(-1), 0xd9);
});

test('the new story uses the image without removing the existing text', () => {
    assert.doesNotThrow(() => new Script(script));
    const vm = makeSite();
    const defaults = runInContext('sectionsDatabase.find(s => s.id === "domov")', vm);
    assert.equal(defaults.image, './' + photoPath);
    assert.equal(defaults.imageFit, 'contain');
    assert.match(defaults.content, /Vajce vtáka Ohniváka/);
    assert.equal(runInContext('validSectionImageUrl(homeStoryPhotoPath)', vm), true);
    assert.equal(runInContext('validSectionImageUrl("javascript:alert(1)")', vm), false);
});

test('one-time migration fills a cloud image placeholder but respects an existing photograph', () => {
    const vm = makeSite();
    runInContext('farmSettings = { email:"example@local.test" }; sectionsDatabase[0].image = ""; applyHomeStoryMigration();', vm);
    assert.equal(runInContext('sectionsDatabase[0].image', vm), './' + photoPath);
    assert.equal(runInContext('homeStoryPhotoReleasePending', vm), true);
    runInContext('sectionsDatabase[0].image = "https://example.com/custom.jpg"; applyHomeStoryMigration();', vm);
    assert.equal(runInContext('sectionsDatabase[0].image', vm), 'https://example.com/custom.jpg');
});

test('photo does not reappear after saved release marker when admin clears it', () => {
    const vm = makeSite();
    runInContext('farmSettings = { homeStoryPhotoReleaseId }; sectionsDatabase[0].image = ""; applyHomeStoryMigration();', vm);
    assert.equal(runInContext('sectionsDatabase[0].image', vm), '');
    assert.equal(runInContext('homeStoryPhotoReleasePending', vm), false);
});

test('uploader validates images and explains how to fix unavailable Supabase Storage', () => {
    assert.match(html, /prepareVarietyPhoto\(imageFile\)/);
    assert.match(html, /Bucket/gi); // generic checking text?
    assert.match(html, /Skontroluj existenciu bucketu site-images/);
    assert.match(html, /image\/jpeg,image\/png,image\/webp/);
    assert.match(html, /validSectionImageUrl\(image\)/);
    const sql = readFileSync('SUPABASE_FOTOGRAFIE.sql','utf8');
    assert.match(sql, /site-images/);
    assert.match(sql, /for insert to authenticated/);
    assert.match(sql, /auth\.uid\(\)/);
});
