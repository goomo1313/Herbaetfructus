/* Verejné SEO profily: rovnaké nastavenie pozastavenia ako na hlavnej stránke. */
(async()=>{
  const links=[...document.querySelectorAll('[data-marker-link]')];
  if(!links.length)return;
  const conf=window.HERBA_CONFIG;
  if(!conf?.supabaseUrl||!conf?.supabaseAnonKey)return;
  try{
    const url=new URL('/rest/v1/site_content',conf.supabaseUrl);
    url.searchParams.set('id','eq.settings');
    url.searchParams.set('select','content');
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),12000);
    let res;
    try{
      res=await fetch(url,{headers:{apikey:conf.supabaseAnonKey,Accept:'application/json'},signal:controller.signal,cache:'no-store'});
    }finally{clearTimeout(timeout);}
    if(!res.ok)return;
    const rows=await res.json();
    if(!Array.isArray(rows)||rows.length!==1||!rows[0]?.content||typeof rows[0].content!=='object')return;
    if(rows[0].content.generatorPaused===true)return;
    links.forEach(link=>{link.hidden=false;});
  }catch(_){
    // Bez overenia stavu generátora ostáva odkaz skrytý.
  }
})();