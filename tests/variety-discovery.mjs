import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicProfiles,renderProfile,mainLogo} from '../scripts/variety-seo-lib.mjs';

const logo=mainLogo(readFileSync('index.html','utf8'));
const records={
 sections:[{id:'paradajky',name:'Paradajky',hidden:false},{id:'tekvice',name:'Tekvice a cukety',hidden:false}],
 varieties:[
  {name:'Ildi',section:'paradajky',hidden:false,info:'Drobné plody.',stock:99,price:1.5},
  {name:'Tigerella',section:'paradajky',hidden:false,info:'Pásikované plody.'},
  {name:'Hokkaido',section:'tekvice',hidden:false,info:'Tekvica.'},
  {name:'Tajná paradajka',section:'paradajky',hidden:true,info:'NEPUBLIKOVAŤ'}
 ]
};

test('profily zobrazujú iba ostatné verejné odrody z rovnakej skupiny',()=>{
 const profiles=publicProfiles(records);
 const tomato=profiles.find(p=>p.name==='Ildi');
 const html=renderProfile(tomato,logo,profiles);
 assert.match(html,/<aside class="profile-explore"/);
 assert.match(html,/<a href="\/odrody\/tigerella\/">Tigerella<\/a>/);
 assert.doesNotMatch(html,/href="\/odrody\/hokkaido\/"|NEPUBLIKOVAŤ|Tajná paradajka/);
 assert.doesNotMatch(html,/data-stock|data-price|stock:99/);
 assert.match(html,/href="\/clanky\/vysev-paradajok\/"/);
 assert.match(html,/href="\/clanky\/ako-odobrat-semena\/"/);
 const alone=renderProfile(tomato,logo);
 assert.doesNotMatch(alone,/Ďalšie odrody z tejto skupiny/);
});

test('tekvice odkazujú iba na články o tekviciach a správny katalóg',()=>{
 const profiles=publicProfiles(records);
 const pumpkin=profiles.find(p=>p.name==='Hokkaido');
 const html=renderProfile(pumpkin,logo,profiles);
 assert.match(html,/href="\/clanky\/od-letnej-cukety-po-zimnu-tekvicu\/"/);
 assert.match(html,/href="\/clanky\/tekvice-krizenie\/"/);
 assert.doesNotMatch(html,/href="\/clanky\/vysev-paradajok\/"/);
 assert.match(html,/href="\/#odroda=Hokkaido"/);
});
