// Súbory s viacerými štítkami: jeden model najviac 12 kusov, viac modelov v ZIP.
export const BATCH_SIZE=12;
export const MAX_NAMES=60;
export function splitMarkers(names){
 if(!Array.isArray(names)||names.length<1||names.length>MAX_NAMES)throw Error('Zadajte 1 až '+MAX_NAMES+' názvov.');
 for(const name of names){
  if(typeof name!=='string'||!name.trim()||Array.from(name).length>40||/[\r\n\0]/.test(name))
   throw Error('Každý názov musí mať 1 až 40 znakov.');
 }
 const groups=[];
 for(let start=0;start<names.length;start+=BATCH_SIZE)groups.push(names.slice(start,start+BATCH_SIZE));
 return groups;
}
const encoder=new TextEncoder();
const u16=(dv,o,v)=>dv.setUint16(o,v,true);
const u32=(dv,o,v)=>dv.setUint32(o,v>>>0,true);
function crc32(bytes){
 let crc=0xffffffff;
 for(const b of bytes){
  crc^=b;
  for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
 }
 return (crc^0xffffffff)>>>0;
}
export function makeZip(entries){
 if(!Array.isArray(entries)||!entries.length||entries.length>100)throw Error('Neplatný počet súborov ZIP.');
 const records=[];
 let offset=0;
 for(const item of entries){
  if(!item||!(/^[a-zA-Z0-9_.-]+$/).test(item.name))throw Error('Neplatný názov súboru ZIP.');
  const data=item.bytes instanceof Uint8Array?item.bytes:item.bytes instanceof ArrayBuffer?new Uint8Array(item.bytes):encoder.encode(String(item.text??''));
  if(data.length>100_000_000)throw Error('Súbor je príliš veľký.');
  const name=encoder.encode(item.name);
  if(name.length>65535)throw Error('Príliš dlhý názov.');
  const local=new Uint8Array(30+name.length+data.length);
  const v=new DataView(local.buffer);
  u32(v,0,0x04034b50);u16(v,4,20);u16(v,6,0);u16(v,8,0);
  u16(v,10,0);u16(v,12,0);u32(v,14,crc32(data));u32(v,18,data.length);u32(v,22,data.length);
  u16(v,26,name.length);u16(v,28,0);local.set(name,30);local.set(data,30+name.length);
  records.push({name,bytes:data,crc:crc32(data),offset,local});
  offset+=local.length;
 }
 const centralStart=offset;
 const central=records.map(entry=>{
  const out=new Uint8Array(46+entry.name.length),dv=new DataView(out.buffer);
  u32(dv,0,0x02014b50);u16(dv,4,20);u16(dv,6,20);u16(dv,8,0);u16(dv,10,0);
  u16(dv,12,0);u16(dv,14,0);u32(dv,16,entry.crc);u32(dv,20,entry.bytes.length);u32(dv,24,entry.bytes.length);
  u16(dv,28,entry.name.length);u16(dv,30,0);u16(dv,32,0);u16(dv,34,0);u16(dv,36,0);
  u32(dv,38,0);u32(dv,42,entry.offset);out.set(entry.name,46);offset+=out.length;return out;
 });
 const end=new Uint8Array(22),dv=new DataView(end.buffer);
 u32(dv,0,0x06054b50);u16(dv,4,0);u16(dv,6,0);u16(dv,8,records.length);u16(dv,10,records.length);
 u32(dv,12,offset-centralStart);u32(dv,16,centralStart);u16(dv,20,0);
 const result=new Uint8Array(offset+end.length);
 let p=0;
 for(const row of records){result.set(row.local,p);p+=row.local.length;}
 for(const entry of central){result.set(entry,p);p+=entry.length;}
 result.set(end,p);
 return result;
}
