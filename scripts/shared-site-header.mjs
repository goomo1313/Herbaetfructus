/* Stála HTML hlavička pre články a SEO profily; navigáciu pri dostupnosti cloudu dopĺňa shared-site-header.js. */
export function sharedHeader(logo,active='') {
 const items=[
  ['domov','Náš príbeh','/#sekcia=domov'],
  ['paradajky','Paradajky','/#sekcia=paradajky'],
  ['tekvice','Tekvice a Cukety','/#sekcia=tekvice'],
  ['blog','Blog & Rady','/#sekcia=blog'],
  ['podmienky','Ako objednať','/#sekcia=podmienky'],
  ['generator','3D generátor','/3d/']
 ];
 const nav=items.map(([id,label,url])=>
  '<li><a href="'+url+'"'+(id===active?' class="active-tab" aria-current="page"':'')+'>'+label+'</a></li>').join('');
 return '<header class="hf-site-header"><nav class="hf-site-nav" aria-label="Hlavná navigácia">'+
  logo+'<ul class="nav-links" data-hf-site-nav>'+nav+'</ul></nav></header>';
}
export function sharedHeaderAssets(prefix){
 return '<link rel="stylesheet" href="'+prefix+'shared-site-header.css?v=20261122-1">'+
  '<script src="'+prefix+'config.js" defer></script>'+
  '<script src="'+prefix+'shared-site-header.js?v=20261122-1" defer></script>';
}
