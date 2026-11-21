/* Herba et Fructus – OpenSCAD render worker. Every render gets a fresh worker:
   Emscripten's OpenSCAD command line exits after producing its output. */
import OpenSCAD from 'https://cdn.jsdelivr.net/npm/@lofcz/openscad-wasm@0.0.2/openscad.js';
import { addFonts } from 'https://cdn.jsdelivr.net/npm/@lofcz/openscad-wasm@0.0.2/openscad.fonts.js';

const limits={
 stick_length:[50,300],stick_width:[3,20],tip_length:[10,100],
 base_height:[1,10],text_height:[1,6],text_size:[6,20],
 border_radius:[0.5,5],max_text_length:[30,150],
 stick_roundness:[0,5],y_spacing:[10,50],text_right_margin:[0,20],
 text_y_factor:[0,1],cutout_length:[5,50],cutout_depth:[1,10],
 cutout_offset:[-50,50],hole_length:[5,50],hole_width:[1,10],
 hole_offset:[-50,50]
};

function validate(input) {
  if (!input || !Array.isArray(input.names) || input.names.length<1 || input.names.length>12)
    throw new Error('Zadajte 1 až 12 názvov.');
  for(const name of input.names){
    if(typeof name!=='string'||!name.trim()||Array.from(name).length>40||/[\r\n\0]/.test(name))
      throw new Error('Každý názov musí mať 1 až 40 znakov.');
  }
  const v=input.params || {};
  for(const [key,[min,max]] of Object.entries(limits)){
    if(!Number.isFinite(v[key])||v[key]<min||v[key]>max)
      throw new Error('Neplatná hodnota parametra '+key+'.');
  }
  if(v.tip_length>=v.stick_length/2)throw new Error('Špička nesmie byť dlhšia ako polovica zápichu.');
  if(v.max_text_length>v.stick_length-v.tip_length)
    throw new Error('Maximálna dĺžka textu presahuje použiteľnú časť zápichu.');
  if(v.y_spacing<v.text_size+2*v.border_radius)
    throw new Error('Medzi riadkami hrozí dotyk štítkov. Zvýšte rozstup.');
  if(v.enable_center_hole && v.hole_width>=v.stick_width)
    throw new Error('Dierka musí byť užšia než samotný zápich.');
  if(!['Liberation Sans','Liberation Serif'].includes(v.font_choice))
    throw new Error('Neplatné písmo.');
  if(typeof input.source!=='string'||!input.source.includes('module plant_marker(txt)'))
    throw new Error('Chýba overený pôvodný model OpenSCAD.');
  return v;
}

self.onmessage=async event=>{
  try{
    const input=event.data;
    const v=validate(input);
    self.postMessage({type:'status',message:'Načítavam výpočtový modul OpenSCAD a písma…'});
    const logs=[];
    const app=await OpenSCAD({
      noInitialRun:true,
      print:text=>{if(logs.length<20)logs.push(String(text));},
      printErr:text=>{if(logs.length<30)logs.push(String(text));}
    });
    addFonts(app);
    app.FS.writeFile('/input.scad',input.source);
    const args=['/input.scad','--enable=manifold','--export-format=binstl','-o','/markers.stl'];
    input.names.forEach((name,index)=>args.push('-D','Name_'+(index+1)+'='+JSON.stringify(name)));
    for(let i=input.names.length;i<12;i++)args.push('-D','Name_'+(i+1)+'=""');
    for(const key of Object.keys(limits))args.push('-D',key+'='+v[key]);
    args.push('-D','font_choice='+JSON.stringify(v.font_choice));
    args.push('-D','enable_cutouts='+Boolean(v.enable_cutouts&&v.stick_width>=10));
    args.push('-D','enable_center_hole='+Boolean(v.enable_center_hole&&v.stick_width>=10));
    self.postMessage({type:'status',message:'Vypočítavam presný 3D model a STL…'});
    const status=app.callMain(args);
    if(typeof status==='number'&&status!==0)throw new Error('OpenSCAD skončil s chybou '+status+': '+logs.slice(-4).join(' '));
    const stl=app.FS.readFile('/markers.stl');
    if(!(stl instanceof Uint8Array)||stl.byteLength<84)
      throw new Error('OpenSCAD nevytvoril platný STL súbor. '+logs.slice(-5).join(' '));
    const copy=stl.slice();
    self.postMessage({type:'result',bytes:copy.buffer},[copy.buffer]);
  }catch(error){
    self.postMessage({type:'error',message:String(error?.message||error||'Neznáma chyba.')});
  }
};
