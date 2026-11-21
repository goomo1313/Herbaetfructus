import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css=readFileSync('site-enhancements.css','utf8');
const page=readFileSync('index.html','utf8');
const catalogue=readFileSync('catalogue-ui.js','utf8');
const legacy=readFileSync('site-polish.css','utf8');

test('mobily používajú dve kompaktné karty odrôd namiesto jedinej',()=>{
 assert.match(css, /@media\s*\(max-width:\s*640px\)[\s\S]*?\.variety-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
 assert.match(css, /\.variety-grid \.variety-card \.card-img-placeholder\s*\{\s*height:\s*clamp\(128px,\s*38vw,\s*156px\)/);
 assert.ok(css.lastIndexOf('@media (max-width: 640px)')>css.indexOf('@media(max-width:510px)'));
 assert.match(legacy, /@media \(max-width: 430px\)/);
});
test('mobilný náhľad necháva podrobnosti až v klikateľnom detaile',()=>{
 assert.match(css, /\.variety-grid \.variety-card p\.info,\s*\.variety-grid \.variety-card \.variety-facts\s*\{\s*display:\s*none/);
 assert.match(page,/function renderVarietyGridForSection\(secId\)/);
 assert.match(page,/shouldOpenVarietyCardDetail\(event\)/);
 assert.match(catalogue,/byId\('detailDescription'\)\.textContent = item\.info/);
 assert.match(catalogue,/byId\('detailProperties'\)\.innerHTML/);
});
test('plus mínus a výber semien zostávajú ovládateľné a vybraná karta zelená',()=>{
 assert.match(css,/\.variety-grid \.variety-card \.card-actions-row \.quantity-selector\s*\{/);
 assert.match(css,/\.variety-grid \.variety-card \.card-actions-row \.btn-select\s*\{/);
 assert.match(css,/\.variety-grid \.variety-card\.in-selection \.card-selection-indicator/);
 assert.match(page,/onclick="changeCardQty\(this, -1\)"/);
 assert.match(page,/onclick="changeCardQty\(this, 1\)"/);
 assert.match(page,/class="btn-select"/);
 assert.match(page,/function syncSelectedVarietyCards\(\)/);
});
test('porovnanie a 3D štítky majú aj v kompaktnom režime samostatné tlačidlá',()=>{
 assert.match(css,/\.variety-grid \.variety-card \.enhanced-compare-btn\s*\{/);
 assert.match(css,/\.variety-grid \.variety-card \.marker-3d-card\s*\{/);
 assert.match(page,/class="marker-3d-card"/);
 assert.match(page,/class="enhanced-compare-btn"/);
 assert.match(page,/openMarkerGeneratorForVariety\(t\.name\)/);
});
test('desktopový katalóg je stále štandardný a nemá zmenené údaje',()=>{
 assert.match(css,/\.variety-grid \{ grid-template-columns:repeat\(auto-fill,minmax\(min\(100%,260px\),1fr\)\); gap:16px; \}/);
 assert.match(page,/let varietyDatabase = \[\.\.\.defaultVarieties\]/);
});
