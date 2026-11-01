import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext, Script } from 'node:vm';
import test from 'node:test';

const html = readFileSync('index.html', 'utf8');
const editorial = readFileSync('editorial-content.js', 'utf8');
const app = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m => m[1]).filter(Boolean).join('\n');

function site() {
    const controls = {};
    const grid = {
        children: [],
        appendChild(element) { this.children.push(element); },
        querySelectorAll() { return this.children; },
        set innerHTML(value) { if (!value) this.children = []; }
    };
    controls.blogGridContainer = grid;
    controls.blogCategory = { value: '', appendChild() {}, set innerHTML(v) {} };
    controls.blogSearch = { value: '' };
    controls.blogResultsCount = { textContent: '' };
    controls.blogEmptyMessage = { style: {} };
    const document = {
        addEventListener() {},
        getElementById(id) { return controls[id] || null; },
        createElement(type) { return { dataset: {}, style: {}, innerHTML: '', hidden: false, value: '', textContent: '' }; },
        body: { classList: { contains() { return false; } } }
    };
    const context = createContext({
        window: { HERBA_CONFIG: {} }, document,
        console: { info() {}, warn() {}, error() {} },
        localStorage: { getItem() { return null; } }
    });
    runInContext(editorial, context);
    runInContext(app, context);
    return { context, grid, controls };
}

test('dvanásť odborných článkov má rubriku, perex, bloky a bezpečné zdroje', () => {
    assert.doesNotThrow(() => new Script(editorial));
    assert.doesNotThrow(() => new Script(app));
    const articles = runInContext('editorialPosts.map(post => ({ ...post }))', site().context);
    assert.equal(articles.length, 12);
    assert.equal(new Set(articles.map(post => post.id)).size, 12);
    assert.equal(new Set(articles.map(post => post.title)).size, 12);
    for (const post of articles) {
        assert.ok(post.category);
        assert.ok(post.excerpt && post.excerpt.length > 50);
        assert.ok(post.readTime);
        assert.ok(post.content.replace(/<[^>]*>/g, ' ').split(/\s+/).length >= 200);
        assert.match(post.content, /<h4>/);
        assert.match(post.content, /class="article-sources"/);
        assert.ok(!post.content.includes('<script'));
        for (const link of post.content.matchAll(/href="([^"]+)"/g)) assert.match(link[1], /^https:\/\//);
    }
});

test('predvolený blog zobrazí články aj bez prihlásenia', () => {
    const articles = runInContext('blogDatabase.map(post => ({ ...post }))', site().context);
    assert.equal(articles.length, 12);
    assert.ok(articles.some(post => post.id === 'hf-tekvice-krizenie'));
});

test('migrácia nahradí len pôvodné ukážky a zachová vlastný príspevok', () => {
    const { context } = site();
    runInContext("blogDatabase = [{title:'Malí Semenári: Ako učíme deti pestovať',content:'S láskou učíme deti tajomstvám semenárstva'}, {title:'Ako správne odoberať semienka paradajok',content:'Zber semienok je krásny proces.'}, {title:'Príprava záhona na jarnú výsadbu',content:'Kvalitný kompost a správne vrstvenie pôdy'}, {title:'Vlastný príspevok',content:'Moje údaje'}]; farmSettings={email:'example@example.com'}; applyEditorialRelease();",context);
    const items = runInContext('blogDatabase.map(post => ({ ...post }))',context);
    assert.equal(items.length, 13);
    assert.equal(items.filter(p => p.id).length, 12);
    assert.ok(items.some(p => p.title === 'Vlastný príspevok' && p.content === 'Moje údaje'));
    runInContext('applyEditorialRelease()',context);
    assert.equal(runInContext('blogDatabase.length',context),13);
});

test('už zmazaný príspevok sa po uloženom vydaní znovu neobjaví', () => {
    const { context } = site();
    runInContext("farmSettings={editorialReleaseId}; blogDatabase=blogDatabase.filter(p=>p.id!=='hf-zahradny-dennik'); applyEditorialRelease();",context);
    assert.equal(runInContext('blogDatabase.length',context),11);
});

test('rozbaľovacie články umožňujú filtrovanie podľa textu a rubriky', () => {
    const { context, grid, controls } = site();
    runInContext('renderBlogPosts()',context);
    assert.equal(grid.children.length,12);
    assert.equal(controls.blogResultsCount.textContent,'Zobrazených 12 z 12 článkov');
    assert.ok(grid.children.every(card => card.innerHTML.includes('blog-details')));
    controls.blogSearch.value = 'Čučoriedky';
    runInContext('filterBlogPosts()',context);
    assert.equal(grid.children.filter(card => !card.hidden).length,1);
    controls.blogSearch.value='';
    controls.blogCategory.value='Semenárstvo';
    runInContext('filterBlogPosts()',context);
    assert.ok(grid.children.filter(card => !card.hidden).length >= 2);
    assert.ok(grid.children.filter(card => !card.hidden).every(card => card.dataset.topic === 'Semenárstvo'));
});

test('publikovanie používa dátový súbor a otvorenie konkrétneho článku', () => {
    assert.match(html, /<script src="\.\/editorial-content\.js"><\/script>/);
    assert.match(html, /function applyEditorialRelease\(\)/);
    assert.match(html, /await persistEditorialReleaseIfNeeded\(\)/);
    assert.match(html, /function openEditorialArticle\(articleId\)/);
});


test('migrácia v2→v3 doplní iba článok o tekviciach, nikdy neobnoví zmazaný obsah', () => {
    const {context} = site();
    runInContext("farmSettings={editorialReleaseId: previousEditorialReleaseId}; blogDatabase=blogDatabase.filter(p=>p.id!=='hf-zahradny-dennik' && p.id!=='hf-od-letnej-cukety-po-zimnu-tekvicu'); applyEditorialRelease();",context);
    const items=runInContext('blogDatabase.map(p=>p.id)',context);
    assert.ok(items.includes('hf-od-letnej-cukety-po-zimnu-tekvicu'));
    assert.ok(!items.includes('hf-zahradny-dennik'), 'už zmazaný článok sa nesmie obnoviť');
    assert.equal(items.filter(id=>id==='hf-od-letnej-cukety-po-zimnu-tekvicu').length,1);
    runInContext('applyEditorialRelease()',context);
    assert.equal(runInContext("blogDatabase.filter(p=>p.id==='hf-od-letnej-cukety-po-zimnu-tekvicu').length",context),1);
});

test('migrácia v1→v3 doplní oba nové články bez obnovenia zmazaných starších článkov', () => {
    const {context}=site();
    runInContext("farmSettings={editorialReleaseId:firstEditorialReleaseId}; blogDatabase=blogDatabase.filter(p=>p.id!=='hf-zahradny-dennik' && p.id!=='hf-odroda-ma-svoj-charakter' && p.id!=='hf-od-letnej-cukety-po-zimnu-tekvicu'); applyEditorialRelease();",context);
    const ids=runInContext('blogDatabase.map(p=>p.id)',context);
    assert.ok(!ids.includes('hf-zahradny-dennik'));
    assert.equal(ids.filter(id=>id==='hf-odroda-ma-svoj-charakter').length,1);
    assert.equal(ids.filter(id=>id==='hf-od-letnej-cukety-po-zimnu-tekvicu').length,1);
});

test('v katalógu ostáva krátky odkaz na nový blogový článok, nie pôvodný blok', () => {
    const {context}=site();
    const snippet=runInContext("catalogueIntroForSection('paradajky')",context);
    assert.match(snippet, /class="catalogue-readmore"/);
    assert.match(snippet, /hf-odroda-ma-svoj-charakter/);
    assert.ok(!snippet.includes('Rýchly sprievodca výberom'));
    assert.ok(!snippet.includes('Za každým názvom je odlišný rast'));
    const article=runInContext("editorialPosts.find(p=>p.id==='hf-odroda-ma-svoj-charakter')",context);
    assert.ok(article);
    assert.match(article.content,/Každá odroda paradajky má svoj charakter/);
    assert.match(article.content,/Hmotnosť plodu je orientačná/);
    assert.match(article.img,/nas-pribeh-paradajky.jpg/);
});

test('sekcia Tekvice a cukety má namiesto dlhého úvodu odkaz na odborný blog', () => {
    const {context}=site();
    const html=runInContext("catalogueIntroForSection('tekvice')",context);
    assert.match(html,/class="catalogue-readmore"/);
    assert.match(html,/hf-od-letnej-cukety-po-zimnu-tekvicu/);
    assert.doesNotMatch(html,/class="catalogue-intro"/);
    assert.ok(!html.includes('Na čo nezabudnúť'));
    const articles=runInContext("editorialPosts.filter(p=>p.category==='Tekvice a cukety')",context);
    assert.equal(articles.length,2);
    assert.ok(articles.some(p=>p.id==='hf-tekvice-krizenie'));
    const guide=articles.find(p=>p.id==='hf-od-letnej-cukety-po-zimnu-tekvicu');
    assert.ok(guide.content.includes('Kedy je zimná tekvica pripravená na zber?'));
    assert.ok(guide.content.includes('Ak si chcete ponechať vlastné semená'));
});
