// Zabezpečený lokálny Chromium smoke test mobilného katalógu, bez zápisu do Supabase.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';

const root=process.cwd();
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8',
 '.mjs':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8',
 '.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png',
 '.svg':'image/svg+xml'};
const server=createServer((req,res)=>{
 try{
  const target=new URL(req.url,'http://localhost');
  const path=resolve(root,'.'+decodeURIComponent(target.pathname)+(target.pathname.endsWith('/')?'index.html':''));
  if(path!==root&&!path.startsWith(root+sep))throw Error('Forbidden');
  const bytes=readFileSync(path);
  res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream'});
  res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
const errors=[];
try{
 browser=await chromium.launch({
  headless:true,
  args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
 });
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 page.on('pageerror',error=>errors.push(error.message));
 // Test nesmie pracovať so skutočným cloudovým katalógom a nezapisuje do cloudu.
 await page.route(/\/rest\/v1\/site_content(?:\?|$)/,route=>route.fulfill({
  status:200,contentType:'application/json',
  headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET,OPTIONS',
   'access-control-allow-headers':'apikey,authorization,accept,content-type,x-client-info'},
  body:'[]'
 }));
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof window.switchSection==='function',{timeout:35000});
 await page.evaluate(()=>window.switchSection('paradajky'));
 const grid=page.locator('[data-section-grid="paradajky"]');
 await grid.locator('.variety-card').first().waitFor({state:'visible',timeout:35000});

 async function measure(width){
  await page.setViewportSize({width,height:844});
  const result=await grid.evaluate(el=>{
   const cards=[...el.querySelectorAll('.variety-card')];
   const c0=cards[0],c1=cards[1];
   if(!c0||!c1)throw Error('Katalóg nemá dve viditeľné karty.');
   const rect=c0.getBoundingClientRect(),other=c1.getBoundingClientRect();
   const image=c0.querySelector('.card-img-placeholder').getBoundingClientRect();
   const add=c0.querySelector('.btn-select')?.getBoundingClientRect();
   const three=c0.querySelector('.marker-3d-card')?.getBoundingClientRect();
   const compare=c0.querySelector('.enhanced-compare-btn')?.getBoundingClientRect();
   const quantity=c0.querySelector('.quantity-selector')?.getBoundingClientRect();
   const gridrect=el.getBoundingClientRect();
   return {
    columns:getComputedStyle(el).gridTemplateColumns,
    width:rect.width,height:rect.height,
    imageHeight:image.height,gridWidth:gridrect.width,
    gridRight:gridrect.right,viewportWidth:innerWidth,
    twoAcross:Math.abs(other.y-rect.y)<3 && other.x>rect.x,
    hasDescription:getComputedStyle(c0.querySelector('p.info')).display!=='none',
    hasThree:!!three,hasCompare:!!compare,
    buttonsFit:!!add&&add.left>=rect.left-2&&add.right<=rect.right+2,
    quantityFit:!!quantity&&quantity.left>=rect.left-2&&quantity.right<=rect.right+2,
    overlayFit:!three||three.left>=rect.left-2&&three.right<=rect.right+2,
    compareFit:!compare||compare.left>=rect.left-2&&compare.right<=rect.right+2
   };
  });
  assert.ok(result.twoAcross,'At '+width+'px cards should be on same row: '+JSON.stringify(result));
  assert.ok(result.width<220,'Oversized card at '+width+'px: '+JSON.stringify(result));
  assert.ok(result.imageHeight<=158,'Oversized photo at '+width+'px: '+JSON.stringify(result));
  assert.ok(!result.hasDescription,'Catalog summary should be in detail at '+width+'px');
  assert.ok(result.buttonsFit&&result.quantityFit&&result.overlayFit&&result.compareFit,
   'Buttons overflow card at '+width+'px: '+JSON.stringify(result));
  assert.ok(result.gridRight<=result.viewportWidth+2,'Horizontal grid overflow: '+JSON.stringify(result));
  console.log('Mobile '+width+'px: 2-column cards '+result.width.toFixed(0)+'×'+result.height.toFixed(0)+'px, photo '+result.imageHeight.toFixed(0)+'px');
 }
 await measure(390);
 await measure(320);
 await page.setViewportSize({width:390,height:844});
 // Karta zostala funkčná: +/- a pridanie do výberu.
 const first=grid.locator('.variety-card').first();
 const input=first.locator('.qty-input');
 const original=Number(await input.inputValue());
 await first.locator('.qty-btn').last().click();
 assert.equal(Number(await input.inputValue()),original+1,'Nefunguje tlačidlo +');
 await first.locator('.qty-btn').first().click();
 assert.equal(Number(await input.inputValue()),original,'Nefunguje tlačidlo -');
 await first.locator('.btn-select').click();
 await page.waitForFunction(()=>document.querySelector('[data-section-grid="paradajky"] .variety-card')?.classList.contains('in-selection'));
 assert.equal(await first.locator('.card-selection-indicator').isVisible(),true);
 // Karta otvára detail so všetkými vlastnosťami aj po skrytí stručného opisu.
 await first.locator('h3 a').click();
 assert.equal(await page.locator('#productDetailOverlay').getAttribute('aria-hidden'),'false');
 assert.ok((await page.locator('#detailDescription').textContent()).trim().length>0);
 await page.locator('#detailClose').click();
 // Desktop sa nemení na dve úzke karty.
 await page.setViewportSize({width:1280,height:900});
 const desktop=await grid.evaluate(el=>{
  const cards=[...el.querySelectorAll('.variety-card')].slice(0,4);
  return cards.map(c=>({x:c.getBoundingClientRect().x,y:c.getBoundingClientRect().y,width:c.getBoundingClientRect().width,
   image:c.querySelector('.card-img-placeholder').getBoundingClientRect().height}));
 });
 assert.ok(desktop[1].x>desktop[0].x && desktop[2].x>desktop[1].x,'Desktop grid layout broken: '+JSON.stringify(desktop));
 assert.ok(desktop[0].image>=185,'Desktop image changed unexpectedly.');
 console.log('Desktop: grid remains multi-column with '+desktop[0].image+'px photos.');
 if(errors.length)console.log('Noncritical page console errors:',errors.slice(0,4));
}finally{
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
