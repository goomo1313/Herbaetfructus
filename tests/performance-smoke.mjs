import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import test from 'node:test';

const html=readFileSync('index.html','utf8');
const script=readFileSync('site-enhancements.js','utf8');
const css=readFileSync('site-enhancements.css','utf8');
const jsFiles=['config.js','editorial-content.js','catalogue-ui.js','site-enhancements.js'];
const cssFiles=['catalogue-ui.css','garden-calendar.css','site-polish.css','site-enhancements.css'];

test('HTML and local assets remain within static-size budgets',()=>{
    const htmlSize=statSync('index.html').size;
    const jsSize=jsFiles.reduce((sum,path)=>sum+statSync(path).size,0);
    const cssSize=cssFiles.reduce((sum,path)=>sum+statSync(path).size,0);
    assert.ok(htmlSize<350_000,'HTML exceeds 350 kB: '+htmlSize);
    assert.ok(jsSize<110_000,'Local JS exceeds 110 kB: '+jsSize);
    assert.ok(cssSize<40_000,'Local CSS exceeds 40 kB: '+cssSize);
    assert.ok(statSync('assets/nas-pribeh-paradajky.jpg').size<250_000,
        'Main story image should stay under 250 kB');
});

test('product cards load only for visited categories, and images decode asynchronously',()=>{
    assert.match(html,/if \(sec\.id === currentActiveSection\) renderVarietyGridForSection\(sec\.id\)/);
    assert.match(html,/if \(grid && grid\.dataset\.rendered !== 'true'\)/);
    assert.match(html,/loading="lazy" decoding="async"/);
    assert.match(html,/loading="eager" fetchpriority="high" decoding="async"/);
    assert.match(css,/content-visibility:auto/);
});

test('changing a search term does not reorder every card in the DOM',()=>{
    assert.match(script,/const previousSort = new Map\(\)/);
    assert.match(script,/if\(previousSort\.get\(sectionId\)!==sort\)/);
    assert.match(script,/previousSort\.set\(sectionId,sort\)/);
});

test('comparison imagery is lazy and photographs are never invented by the comparison widget',()=>{
    assert.match(script,/image\.loading='lazy'/);
    assert.match(script,/image\.decoding='async'/);
    assert.match(script,/Bez fotografie/);
});

/* These checks guard static source budgets. Real loading times, fonts, Supabase
   image transfers and network latency still require browser measurements. */
