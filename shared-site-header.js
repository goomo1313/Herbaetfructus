/* Spoločná verejná navigácia podstránok. Súkromné koncepty ani údaje správcu nenačítava. */
(() => {
  'use strict';
  const nav = document.querySelector('[data-hf-site-nav]');
  if (!nav) return;
  const path = location.pathname;
  const active = id => id === 'blog' ? /^\/clanky(?:\/|$)/.test(path)
    : id === 'generator' ? /^\/3d(?:\/|$)/.test(path) : false;
  function link(label, href, id) {
    const li=document.createElement('li');
    const a=document.createElement('a');
    a.href=href;a.textContent=label;
    if(active(id)){a.classList.add('active-tab');a.setAttribute('aria-current','page');}
    li.appendChild(a);return li;
  }
  function render(sections, paused) {
    const fragment=document.createDocumentFragment();
    const seen=new Set();
    for (const sec of sections) {
      if (!sec || sec.hidden !== false || typeof sec.id !== 'string' ||
          !/^[a-z0-9-]{1,60}$/.test(sec.id) ||
          ['pripravujeme','kalendar'].includes(sec.id) || seen.has(sec.id)) continue;
      const label=String(sec.name||'').trim().slice(0,80);
      if (!label) continue;
      seen.add(sec.id);
      fragment.appendChild(link(label,'/#sekcia='+encodeURIComponent(sec.id),sec.id));
    }
    if (paused !== true) fragment.appendChild(link('3D generátor','/3d/','generator'));
    nav.replaceChildren(fragment);
  }
  async function update() {
    const config=window.HERBA_CONFIG;
    if(!config?.supabaseUrl || !config?.supabaseAnonKey) return;
    try {
      const url=new URL('/rest/v1/site_content', config.supabaseUrl);
      url.searchParams.set('select','id,content');
      url.searchParams.set('id','in.(sections,settings)');
      const controller=new AbortController();
      const abort=setTimeout(()=>controller.abort(),4500);
      let response;
      try{
        response=await fetch(url.toString(),{headers:{apikey:config.supabaseAnonKey,Accept:'application/json'},signal:controller.signal,cache:'no-store'});
      }finally{clearTimeout(abort);}
      if(!response.ok) return;
      const rows=await response.json();
      if(!Array.isArray(rows)) return;
      const sections=rows.find(row=>row?.id==='sections')?.content;
      const settings=rows.find(row=>row?.id==='settings')?.content;
      if(Array.isArray(sections)) render(sections,settings?.generatorPaused);
    }catch(_){/* Dostupná zostáva statická, indexovateľná navigácia. */}
  }
  update();
})();
