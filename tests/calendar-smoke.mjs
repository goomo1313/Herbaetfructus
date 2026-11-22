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

test('kalendár je rozbaľovacou súčasťou blogu a košík zostáva funkčný',()=>{
    assert.doesNotThrow(()=>new Script(inline));
    assert.match(html,/function openOrderForm\(\)/);
    assert.match(html,/onclick="openOrderForm\(\)"/);
    assert.doesNotMatch(html,/calendarButton\.onclick = \(\) => switchSection\('kalendar'\)/);
    assert.match(html,/id="blogCalendarDisclosure"/);
    assert.match(html,/id="blogCalendarMount"/);
    assert.match(html,/calendarMount\.appendChild\(calendar\)/);
    assert.match(html,/panel\.open = true/);
    assert.match(html,/secId === 'kalendar'/);
    assert.match(calendarCss,/\.garden-month-grid/);
});

test('úvodné odkazy smerujú na katalóg, blog a kalendár',()=>{
    for(const section of ['paradajky','blog','kalendar']) {
        assert.match(html,new RegExp('onclick="switchSection\\(\\x27'+section+'\\x27\\)"'));
    }
});


test('kalendár nenechá horný nadpis ani hlavnú navigáciu prilepené pri čítaní',()=>{
    const polishCss = readFileSync('site-polish.css','utf8');
    assert.match(html,/body > header \{\s*background-color:/);
    assert.doesNotMatch(html,/\n\s*header \{\s*background-color: var\(--surface-color\)/);
    assert.ok(html.includes("secId === 'blog' && document.getElementById('blogCalendarDisclosure')?.open === true"));
    assert.match(calendarCss,/body\.calendar-reading > header[\s\S]*?position:\s*static/);
    assert.match(calendarCss,/\.garden-calendar > \.garden-calendar-header[\s\S]*?position:\s*static/);
    assert.doesNotMatch(polishCss,/body\.admin-mode header\s*\{/);
    assert.match(polishCss,/body\.admin-mode > header\s*\{/);
});

test('rozhodujúci obsah kalendára zostal jediný a pri obnovení blogu sa nestratí',()=>{
    assert.equal((html.match(/id="gardenCalendarSection"/g)||[]).length,1);
    assert.equal((html.match(/id="blogCalendarDisclosure"/g)||[]).length,1);
    assert.match(html,/const calendarWasOpen = document\.getElementById\('blogCalendarDisclosure'\)\?\.open === true/);
    assert.match(html,/document\.body\.insertBefore\(calendar, fallback\)/);
    assert.match(html,/disclosure\.open = calendarWasOpen/);
    assert.match(html,/disclosure\.addEventListener\('toggle'/);
});

test('kalendár je skutočne v blogu a všetky vygenerované menu ho majú len ako obsah, nie kartu',()=>{
    const archive=readFileSync('clanky/index.html','utf8');
    const generator=readFileSync('3d/index.html','utf8');
    const navCode=html.slice(html.indexOf('function renderNav()'),html.indexOf('function openOrderForm()'));
    assert.doesNotMatch(navCode,/calendarButton|Pestovateľský kalendár/);
    assert.match(html,/id="blogCalendarDisclosure"/);
    assert.match(html,/id="blogCalendarMount"/);
    for(const page of [archive,generator]){
        const menu=page.match(/<ul class="nav-links" data-hf-site-nav>([\s\S]*?)<\/ul>/)?.[1]||'';
        assert.ok(menu,'Verejné podstránky musia mať navigáciu');
        assert.ok(!menu.includes('Pestovateľský kalendár'),'Kalendár nemá mať vlastnú navigačnú kartu');
    }
    assert.match(archive,/class="archive-calendar-feature"/);
    assert.match(archive,/href="\/#sekcia=kalendar"/);
});
