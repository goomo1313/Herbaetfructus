import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const editorial = readFileSync('editorial-content.js', 'utf8');
const sitemap = readFileSync('sitemap.xml', 'utf8');
const robots = readFileSync('robots.txt', 'utf8');
const cname = readFileSync('CNAME', 'utf8').trim();

test('GitHub Pages has the correct apex custom domain', () => {
    assert.equal(cname, 'herbaetfructus.sk');
});

test('canonical and social sharing use the production domain', () => {
    assert.match(html, /<link rel="canonical" href="https:\/\/herbaetfructus\.sk\/"/);
    assert.match(html, /<meta property="og:url" content="https:\/\/herbaetfructus\.sk\/"/);
    assert.match(html, /<meta property="og:image" content="https:\/\/herbaetfructus\.sk\/assets\/nas-pribeh-paradajky\.jpg"/);
});

test('sitemap, robots and editorial images have custom-domain URLs', () => {
    assert.match(sitemap, /<loc>https:\/\/herbaetfructus\.sk\/<\/loc>/);
    assert.match(robots, /Sitemap: https:\/\/herbaetfructus\.sk\/sitemap\.xml/);
    assert.match(editorial, /https:\/\/herbaetfructus\.sk\/assets\/nas-pribeh-paradajky\.jpg/);
    for (const source of [html,editorial,sitemap,robots]) {
        assert.doesNotMatch(source, /goomo1313\.github\.io\/Herbaetfructus/);
    }
});
