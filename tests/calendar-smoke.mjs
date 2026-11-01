import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import test from 'node:test';

const html = readFileSync('index.html','utf8');
const calendarCss = readFileSync('garden-calendar.css','utf8');
const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(m => m[1]).filter(Boolean).join('\n');

test('celoročný kalendár má všetkých 12 mesiacov a klimatickú výhradu', () => {
    const names = ['Január','Február','Marec','Apríl','Máj','Jún',
        'Júl','August','September','Október','November','December'];
    assert.match(html,/id="gardenCalendarSection"/);
    assert.match(html,/id="gardenCalendarTitle"/);
    const start = html.indexOf('id="gardenCalendarSection"');
    const end = html.indexOf('<!-- AKO OBJEDNAŤ',start);
    const snippet = html.slice(start,end);
    assert.equal((snippet.match(/class="garden-month"/g)||[]).length,12);
    for(const month of names) assert.match(snippet,new RegExp('<h4>'+month+'</h4>'));
    assert.match(snippet,/chladnejšou podhorskou záhradou/);
});

test('návštevníci majú sedem odpovedí na časté otázky',()=>{
    const start=html.indexOf('id="gardenFaqTitle"');
    const end=html.indexOf('</section>',start);
    assert.equal((html.slice(start,end).match(/<details><summary>/g)||[]).length,7);
    assert.match(html,/Kedy mám vysievať paradajky/);
    assert.match(html,/dopyt/);
});

test('navigácia kalendára a košíka má fungujúce obslužné funkcie',()=>{
    assert.doesNotThrow(()=>new Script(inline));
    assert.match(html,/function openOrderForm\(\)/);
    assert.match(html,/onclick="openOrderForm\(\)"/);
    assert.match(html,/calendarButton.onclick = \(\) => switchSection\('kalendar'\)/);
    assert.match(html,/calendarSec\.style\.display = secId === 'kalendar'/);
    assert.match(calendarCss,/\.garden-month-grid/);
});

test('úvodné odkazy smerujú na katalóg, blog a kalendár',()=>{
    for(const section of ['paradajky','blog','kalendar']) {
        assert.match(html,new RegExp('onclick="switchSection\\(\\x27'+section+'\\x27\\)"'));
    }
});
