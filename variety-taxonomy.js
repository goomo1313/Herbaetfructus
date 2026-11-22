/* Herba et Fructus: oddelený typ plodu a spôsob rastu. */
(() => {
 'use strict';
 const UNKNOWN='Neurčený';
 const growths=Object.freeze([UNKNOWN,'Indeterminantná','Determinantná','Polodeterminantná']);
 const types=Object.freeze([UNKNOWN,'Multiflora','Cherry & Koktailová','Býčie srdce','Veľkoplodá','Šalátová','Omáčková','Zberateľská špecialita','Tekvica','Cuketa','Patizón']);
 const aliases=Object.freeze({'Indeterminantná':'Indeterminantná','Determinantná':'Determinantná','Polodeterminantná':'Polodeterminantná','Semi-determinantná':'Polodeterminantná','Determinantná (Plazivá)':'Determinantná'});
 const txt=v=>typeof v==='string'?v.trim():'';
 function fruitType(item){if(!item)return UNKNOWN;const a=txt(item.fruitType);if(a)return a;const b=txt(item.type);return !b||aliases[b]||b==='Neurčené'?UNKNOWN:b;}
 function growthHabit(item){if(!item)return UNKNOWN;const a=txt(item.growthHabit);if(growths.includes(a))return a;const b=txt(item.type);if(aliases[b])return aliases[b];const p=txt(item.properties?.growth).toLocaleLowerCase('sk');if(['indeterminantná','tyčková','kolíková'].includes(p))return 'Indeterminantná';if(['determinantná','kríčková'].includes(p))return 'Determinantná';if(['polodeterminantná','semideterminantná'].includes(p))return 'Polodeterminantná';return UNKNOWN;}
 function fromEditor(item,fruit,growth){const f=txt(fruit)||UNKNOWN,g=txt(growth)||UNKNOWN;if(aliases[f])throw Error('Spôsob rastu patrí do samostatného poľa.');if(!growths.includes(g))throw Error('Neplatný spôsob rastu.');return {...item,type:f,fruitType:f,growthHabit:g};}
 window.HERBA_TAXONOMY=Object.freeze({UNKNOWN,types,growths,fruitType,growthHabit,fromEditor});
})();
