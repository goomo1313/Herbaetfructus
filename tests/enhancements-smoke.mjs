import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext,Script} from 'node:vm';
import test from 'node:test';

const html=readFileSync('index.html','utf8');
const code=readFileSync('site-enhancements.js','utf8');
const css=readFileSync('site-enhancements.css','utf8');
const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(x=>x[1]).filter(Boolean).join('\n');

function makeEnvironment() {
    const nodes=new Map();
    const doc={
        body:{classList:{contains:()=>false}},
        addEventListener(){},
        querySelectorAll(){return []},
        querySelector(){return null},
        getElementById(id){return nodes.get(id)||null},
        createElement(){return {dataset:{},style:{},children:[],setAttribute(){},addEventListener(){},append(...x){this.children.push(...x)},appendChild(x){this.children.push(x)},textContent:''}},
        activeElement:{focus(){}}
    };
    const window={HERBA_CONFIG:{}};
    const context=createContext({window,document:doc,console:{warn(){},error(){},info(){}},
        localStorage:{getItem(){return null}},setTimeout(){},alert(){},confirm(){return true}});
    runInContext(inline,context);
    runInContext(code,context);
    return {context,doc,window,nodes};
}

test('dashboard statistics are based on actual record fields and never mutate source',()=>{
    const env=makeEnvironment();
    const sample=[
        {name:'A',section:'paradajky',type:'Cherry',color:'Červená',weight:'15-25 g',
            info:'Kvalitná odroda',seedsPerPack:'10 ks',price:'1.5',stock:2,img:'https://example.test/a.jpg',hidden:false},
        {name:'B',section:'paradajky',type:'',color:'',weight:'',info:'',seedsPerPack:'10 ks',price:'1.2',
            stock:0,img:'',hidden:false},
        {name:'C',section:'paradajky',type:'Indeterminantná',color:'žltá',weight:'80g',
            info:'Opis',seedsPerPack:'10 ks',price:'1.3',stock:1,img:'',gallery:['https://example.test/b.jpg'],hidden:true}
    ];
    const before=JSON.stringify(sample);
    const d=env.window.HERBA_IMPROVEMENTS.diagnostics(sample);
    assert.deepEqual({...d},{total:3,visible:2,hidden:1,noPhoto:1,incomplete:1,soldOut:1,stock:3});
    assert.equal(JSON.stringify(sample),before);
});

test('size filtering uses approximate range midpoint without fabricating mass',()=>{
    const {window}=makeEnvironment();
    const {grams,weightMatches}=window.HERBA_IMPROVEMENTS;
    assert.equal(grams('15–25g'),20);
    assert.equal(grams('1,2 kg'),1200);
    assert.ok(Number.isNaN(grams('neurčená')));
    assert.equal(weightMatches('15–25 g','small'),true);
    assert.equal(weightMatches('120–200 g','large'),true);
    assert.equal(weightMatches('10g','giant'),false);
    assert.equal(weightMatches('neznáma','small'),false);
});

test('comparison keeps a maximum of three distinct names and can remove one',()=>{
    const {context,window}=makeEnvironment();
    const names=Array.from(runInContext('varietyDatabase.slice(0,4).map(v=>v.name)',context));
    for (let i=0;i<3;i++) assert.equal(window.HERBA_IMPROVEMENTS.toggleCompare(names[i]),true);
    assert.equal(window.HERBA_IMPROVEMENTS.toggleCompare(names[3]),false);
    assert.deepEqual(Array.from(window.HERBA_IMPROVEMENTS.selected()),names.slice(0,3));
    assert.equal(window.HERBA_IMPROVEMENTS.toggleCompare(names[1]),true);
    assert.equal(window.HERBA_IMPROVEMENTS.selected().length,2);
    window.HERBA_IMPROVEMENTS.resetCompare();
    assert.equal(window.HERBA_IMPROVEMENTS.selected().length,0);
});

test('dashboard is gated behind administrator authentication',()=>{
    const env=makeEnvironment();
    assert.equal(env.window.HERBA_IMPROVEMENTS.dashboardOpen(),false);
});

test('price, availability and alphabetical sorting change only presentation',()=>{
    const env=makeEnvironment(),{doc,nodes,window}=env;
    const makeCard=(name,price,weight,stock,originalOrder)=>{
        return {dataset:{name,price:String(price),weight:String(weight),weightText:String(weight)+'g',
            stock:String(stock),originalOrder:String(originalOrder),hidden:'false',hasPhoto:'true',
            search:name.toLocaleLowerCase('sk'),type:'cherry',color:'červená'},
            style:{}};
    };
    const cards=[makeCard('Zulu',2.5,15,0,0),makeCard('Ábel',1.5,100,2,1),
        makeCard('Beta',1.9,50,1,2)];
    const grid={
        querySelectorAll(){return cards.slice()},
        appendChild(card){const i=cards.indexOf(card);if(i>=0)cards.splice(i,1);cards.push(card)}
    };
    const controls={
        'searchInput_paradajky':{value:''},
        'filterAvailability_paradajky':{value:'stock'},
        'filterWeight_paradajky':{value:'all'},
        'filterSort_paradajky':{value:'price-asc'},
        'filterCount_paradajky':{textContent:''}
    };
    doc.querySelector=s=>s.includes('paradajky')?grid:null;
    doc.getElementById=id=>controls[id]||null;
    window.HERBA_IMPROVEMENTS.applyFilters('paradajky');
    assert.equal(cards.find(c=>c.dataset.name==='Zulu').style.display,'none');
    assert.deepEqual(cards.map(c=>c.dataset.name),['Ábel','Beta','Zulu']);
    assert.equal(controls.filterCount_paradajky.textContent,'Zobrazených 2 z 3 odrôd');
    controls.filterAvailability_paradajky.value='all';
    controls.filterSort_paradajky.value='default';
    window.HERBA_IMPROVEMENTS.applyFilters('paradajky');
    assert.deepEqual(cards.map(c=>c.dataset.name),['Zulu','Ábel','Beta']);
});

test('catalogue optimization renders only the active section initially',()=>{
    assert.doesNotThrow(()=>new Script(code));
    assert.match(html,/if \(sec\.id === currentActiveSection\) renderVarietyGridForSection\(sec\.id\)/);
    assert.match(html,/grid\.dataset\.rendered !== 'true'/);
    assert.match(html,/grid\.dataset\.rendered = 'true'/);
    assert.match(html,/loading="lazy" decoding="async"/);
    assert.match(css,/content-visibility:auto/);
    assert.match(html,/id="enhancedDashboardOverlay"/);
    assert.match(html,/id="enhancedCompareOverlay"/);
    assert.match(html,/site-enhancements\.js/);
});
