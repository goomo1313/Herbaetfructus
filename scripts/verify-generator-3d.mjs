// Opt-in CI smoke: invoke a real OpenSCAD WASM render and verify non-empty binary STL.
// Requires: npm install --no-save @lofcz/openscad-wasm@0.0.2
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {createRequire} from 'node:module';
import OpenSCAD from '@lofcz/openscad-wasm';
import {addFonts} from '@lofcz/openscad-wasm/fonts';

const require=createRequire(import.meta.url);
const wasmPath=join(dirname(require.resolve('@lofcz/openscad-wasm')),'openscad.wasm');
const wasm=readFileSync(wasmPath);
console.log('OpenSCAD WASM bytes:',wasm.length);
const instance=await OpenSCAD({
 noInitialRun:true,
 instantiateWasm(imports,callback){
  WebAssembly.instantiate(wasm,imports).then(result=>callback(result.instance));
  return {};
 }
});
addFonts(instance);
const input=readFileSync('3d/model/plant-markers.scad','utf8');
assert.match(input,/module plant_marker\(txt\)/);
instance.FS.writeFile('/input.scad',input);
const logs=[];
const result=instance.callMain([
 '/input.scad','--enable=manifold','--export-format=binstl',
 '-D','Name_1="Ľalička"',
 '-D','Name_2=""',
 '-D','stick_width=5',
 '-o','/out.stl'
]);
assert.ok(result===0||result===undefined,'Nonzero OpenSCAD exit code '+result);
const output=instance.FS.readFile('/out.stl');
assert.ok(output.length>84,'Binary STL is missing');
const view=new DataView(output.buffer,output.byteOffset,output.byteLength);
const count=view.getUint32(80,true);
assert.ok(count>10,'No 3D triangles generated');
assert.equal(output.byteLength,84+50*count,'Invalid binary STL length');
console.log('Real OpenSCAD marker render successful:',count,'triangles,',output.byteLength,'bytes');
