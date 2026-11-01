import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import test from 'node:test';

const html = readFileSync('index.html', 'utf8');
const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1]).filter(Boolean).join('\n');

function site() {
    const alerts = [];
    const mock = {
        window: { HERBA_CONFIG: {} },
        document: {
            addEventListener() {},
            getElementById() { return null; },
            querySelectorAll() { return []; },
            body: { classList: { contains() { return false; } } }
        },
        localStorage: { getItem() { return null; } },
        console: { warn() {}, info() {}, error() {} },
        setTimeout() {},
        alert(message) { alerts.push(String(message)); },
        confirm() { return true; }
    };
    const context = createContext(mock);
    runInContext(script, context);
    runInContext('requireAdmin = () => true; renderAll = () => {}; openTableManagerModal = () => {}; openSectionTableModal = () => {}; renderAdminTable = () => {}; showToast = () => {};', context);
    return { context, alerts };
}

test('failed deletion must not remove a variety or article', async () => {
    const { context } = site();
    const before = runInContext('({v:varietyDatabase.length,b:blogDatabase.length,s:sectionsDatabase.length})', context);
    runInContext('queueCloudSave = async () => false', context);
    assert.equal(await runInContext('deleteVariety(0)', context), false);
    assert.equal(await runInContext('deleteBlogPost(0)', context), false);
    assert.equal(await runInContext('deleteVarietyFromTable(0)', context), false);
    const after = runInContext('({v:varietyDatabase.length,b:blogDatabase.length,s:sectionsDatabase.length})',context);
    assert.deepEqual({...after}, {...before});
});

test('successful deletion changes local data only after cloud write completes', async () => {
    const { context } = site();
    const total = runInContext('varietyDatabase.length', context);
    runInContext('queueCloudSave = async () => true', context);
    assert.equal(await runInContext('deleteVariety(0)',context), true);
    assert.equal(runInContext('varietyDatabase.length',context), total-1);
});

test('failed change of order leaves catalogue and navigation unchanged',async () => {
    const {context} = site();
    const before = runInContext('({ names: varietyDatabase.map(v=>v.name), ids: sectionsDatabase.map(s=>s.id) })',context);
    runInContext('queueCloudSave = async () => false', context);
    assert.equal(await runInContext('moveVariety(0,1)',context),false);
    assert.equal(await runInContext('moveSection(0,1)',context),false);
    const after = runInContext('({ names: varietyDatabase.map(v=>v.name), ids: sectionsDatabase.map(s=>s.id) })',context);
    assert.deepEqual([...after.names],[...before.names]);
    assert.deepEqual([...after.ids],[...before.ids]);
});

test('cannot delete a section with varieties or a system section',async () => {
    const {context,alerts} = site();
    runInContext('queueCloudSave = async () => true',context);
    const original = runInContext('sectionsDatabase.length',context);
    const occupiedIndex = runInContext('sectionsDatabase.findIndex(s=>varietyDatabase.some(v=>v.section===s.id))',context);
    assert.ok(occupiedIndex>=0);
    assert.equal(await runInContext('deleteSection',context)(occupiedIndex),false);
    assert.equal(await runInContext('deleteSection',context)(0),false);
    assert.equal(runInContext('sectionsDatabase.length',context),original);
    assert.ok(alerts.length>=2);
});

test('article fallback without a browser DOM parser treats HTML as text', () => {
    const {context} = site();
    const result = runInContext("sanitizeRichHtml('<img src=x onerror=alert(1)><script>alert(1)</script><strong>Článok</strong>')",context);
    assert.ok(!result.includes('<script>'));
    assert.ok(!result.includes('<img '));
    assert.match(result,/&lt;strong&gt;/);
});

test('article HTML uses sanitization for rich and simple blog entries',()=>{
    assert.equal((html.match(/sanitizeRichHtml\(post\.content\)/g)||[]).length,2);
    assert.match(html,/const discard = new Set\(\[/);
    assert.match(html,/allow-scripts allow-same-origin allow-presentation/);
});
