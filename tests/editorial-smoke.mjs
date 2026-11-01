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

test('desiatka odborných článkov má rubriku, perex, bloky a bezpečné zdroje', () => {
    assert.doesNotThrow(() => new Script(editorial));
    assert.doesNotThrow(() => new Script(app));
    const articles = runInContext('editorialPosts.map(post => ({ ...post }))', site().context);
    assert.equal(articles.length, 10);
    assert.equal(new Set(articles.map(post => post.id)).size, 10);
    assert.equal(new Set(articles.map(post => post.title)).size, 10);
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
    assert.equal(articles.length, 10);
    assert.ok(articles.some(post => post.id === 'hf-tekvice-krizenie'));
});

test('migrácia nahradí len pôvodné ukážky a zachová vlastný príspevok', () => {
    const { context } = site();
    runInContext("blogDatabase = [{title:'Malí Semenári: Ako učíme deti pestovať',content:'S láskou učíme deti tajomstvám semenárstva'}, {title:'Ako správne odoberať semienka paradajok',content:'Zber semienok je krásny proces.'}, {title:'Príprava záhona na jarnú výsadbu',content:'Kvalitný kompost a správne vrstvenie pôdy'}, {title:'Vlastný príspevok',content:'Moje údaje'}]; farmSettings={email:'example@example.com'}; applyEditorialRelease();",context);
    const items = runInContext('blogDatabase.map(post => ({ ...post }))',context);
    assert.equal(items.length, 11);
    assert.equal(items.filter(p => p.id).length, 10);
    assert.ok(items.some(p => p.title === 'Vlastný príspevok' && p.content === 'Moje údaje'));
    runInContext('applyEditorialRelease()',context);
    assert.equal(runInContext('blogDatabase.length',context),11);
});

test('už zmazaný príspevok sa po uloženom vydaní znovu neobjaví', () => {
    const { context } = site();
    runInContext("farmSettings={editorialReleaseId}; blogDatabase=blogDatabase.filter(p=>p.id!=='hf-zahradny-dennik'); applyEditorialRelease();",context);
    assert.equal(runInContext('blogDatabase.length',context),9);
});

test('rozbaľovacie články umožňujú filtrovanie podľa textu a rubriky', () => {
    const { context, grid, controls } = site();
    runInContext('renderBlogPosts()',context);
    assert.equal(grid.children.length,10);
    assert.equal(controls.blogResultsCount.textContent,'Zobrazených 10 z 10 článkov');
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
