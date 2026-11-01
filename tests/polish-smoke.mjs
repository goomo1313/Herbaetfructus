import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import test from 'node:test';

const html = readFileSync('index.html','utf8');
const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(m=>m[1]).filter(Boolean).join('\n');

function site(remoteMode = 'equal') {
    const alerts = [], toasts = [], offsets = [];
    let writes = 0;
    const root = {style:{setProperty(name,value){offsets.push([name,value]);}}};
    const toolbar = {classList:{contains(name){return name==='active';}},getBoundingClientRect(){return {height:94}}};
    const ctx = createContext({
        document:{
            documentElement:root,
            getElementById(id){return id==='adminBar'?toolbar:null;},
            addEventListener(){},
            body:{classList:{contains(){return false;}}}
        },
        window:{
            HERBA_CONFIG:{supabaseUrl:'https://example.supabase.co',supabaseAnonKey:'test-public-value'},
            supabase:{createClient(){return {from(){
                return {
                    select: async() => {
                        const records = runInContext("({sections:sectionsDatabase,varieties:varietyDatabase,blog:blogDatabase,settings:farmSettings})",ctx);
                        if(remoteMode==='missing') delete records.blog;
                        if(remoteMode==='different') records.varieties = [];
                        return {data:Object.entries(records).map(([id,content])=>({id,content})),error:null};
                    },
                    upsert(){writes++;throw Error('Read-only verification attempted to write');}
                };
            }};}}
        },
        localStorage:{getItem(){return null;}},
        console:{warn(){},info(){},error(){}},
        setTimeout(){},
        alert(x){alerts.push(String(x));}
    });
    runInContext(inline,ctx);
    runInContext('adminAuthenticated=true; cloudDatabaseReady=true; requireAdmin=()=>true; showToast=m=>window.__messages.push(m);',ctx);
    ctx.window.__messages=toasts;
    return {ctx,alerts,toasts,offsets,get writes(){return writes;}};
}

test('cloud verification reads but never overwrites verified content',async()=>{
    const app=site();
    assert.equal(await runInContext('downloadSiteCode()',app.ctx),true);
    assert.equal(app.writes,0);
    assert.ok(app.toasts.some(s=>s.includes('zhodné so Supabase')));
});

test('cloud verification warns on a stale browser without overwriting remote data',async()=>{
    const app=site('different');
    assert.equal(await runInContext('downloadSiteCode()',app.ctx),false);
    assert.equal(app.writes,0);
    assert.ok(app.alerts.some(s=>s.includes('Odlišné záznamy')));
});

test('missing cloud row is reported without creating default records',async()=>{
    const app=site('missing');
    assert.equal(await runInContext('downloadSiteCode()',app.ctx),false);
    assert.equal(app.writes,0);
    assert.ok(app.alerts.some(s=>s.includes('Chýbajúce záznamy')));
});

test('admin offset follows actual toolbar size',()=>{
    const app=site();
    runInContext('syncAdminBarHeight()',app.ctx);
    assert.deepEqual([...app.offsets.at(-1)],['--admin-bar-height','94px']);
});

test('website metadata and navigation are available without changing catalogue data',()=>{
    const sitemap=readFileSync('sitemap.xml','utf8');
    const robots=readFileSync('robots.txt','utf8');
    const css=readFileSync('site-polish.css','utf8');
    assert.match(sitemap,/https:\/\/goomo1313\.github\.io\/Herbaetfructus\//);
    assert.match(robots,/Sitemap:/);
    assert.match(html,/rel="canonical"/);
    assert.match(html,/og:image/);
    assert.match(html,/class="skip-to-content"/);
    assert.match(html,/site-polish\.css/);
    assert.match(css,/prefers-reduced-motion/);
    assert.match(css,/#adminBar/);
});
