// Browser smoke test of public 3D generator (optional GitHub Actions job).
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,statSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';

const root=process.cwd();
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8',
 '.css':'text/css;charset=utf-8','.scad':'text/plain;charset=utf-8',
 '.json':'application/json','.wasm':'application/wasm'};
const server=createServer((request,response)=>{
 try{
  const url=new URL(request.url,'http://localhost');
  const pathname=decodeURIComponent(url.pathname);
  const filename=resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
  if(filename!==root && !filename.startsWith(root+sep))throw Error('Forbidden');
  const buffer=readFileSync(filename);
  response.writeHead(200,{'content-type':mime[extname(filename)]||'application/octet-stream'});
  response.end(buffer);
 }catch(error){response.writeHead(404);response.end('Not found');}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const port=server.address().port;
let browser;
const errors=[];
try{
 browser=await chromium.launch({
  headless:true,
  args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
 });
 const page=await browser.newPage({acceptDownloads:true});
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
 await page.route('**/rest/v1/site_content**',route=>route.fulfill({
  status:200,contentType:'application/json',
  headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET,OPTIONS','access-control-allow-headers':'apikey,accept,content-type'},
  body:JSON.stringify([{id:'settings',content:{generatorPaused:false}}])
 }));
 await page.goto('http://127.0.0.1:'+port+'/3d/',{waitUntil:'domcontentloaded'});
 await page.locator('#generatorApp').waitFor({state:'visible',timeout:35000});
 await page.locator('#names').fill('Ľalička');
 await page.locator('#generateBtn').click();
 try{
  await page.waitForFunction(()=>{
   const button=document.getElementById('downloadStl');
   return button && !button.disabled;
  },null,{timeout:160000});
 }catch(e){
  throw Error('Browser render not ready. Status: '+await page.locator('#renderStatus').textContent()+
   ' Form: '+await page.locator('#formError').textContent()+
   ' Errors: '+JSON.stringify(errors.slice(-5)));
 }
 assert.match(await page.locator('#renderStatus').textContent(),/Model je pripravený/);
 const promise=page.waitForEvent('download');
 await page.locator('#downloadStl').click();
 const artifact=await promise;
 assert.match(artifact.suggestedFilename(),/\.stl$/);
 const stream=await artifact.createReadStream();
 let bytes=0;
 for await(const chunk of stream)bytes+=chunk.length;
 assert.ok(bytes>100,'Downloaded STL is empty');
 console.log('Browser: generated/downloaded',artifact.suggestedFilename(),bytes,'bytes');
 // A paused state must hide the controls, not just the navigation.
 const paused=await browser.newPage();
 await paused.route('**/rest/v1/site_content**',route=>route.fulfill({
  status:200,contentType:'application/json',
  headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET,OPTIONS','access-control-allow-headers':'apikey,accept,content-type'},
  body:JSON.stringify([{id:'settings',content:{generatorPaused:true}}])
 }));
 await paused.goto('http://127.0.0.1:'+port+'/3d/',{waitUntil:'domcontentloaded'});
 await paused.waitForFunction(()=>document.getElementById('generatorGate')?.textContent?.includes('pozastavený'));
 assert.equal(await paused.locator('#generatorApp').isVisible(),false);
 console.log('Browser: admin pause blocks direct access to generator controls.');
 if(errors.length)console.log('Browser console warnings:',errors.slice(-5));
}finally{
 await browser?.close();
 await new Promise(done=>server.close(done));
}
