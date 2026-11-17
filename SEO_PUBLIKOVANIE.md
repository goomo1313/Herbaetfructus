# SEO články – Herba et Fructus

Verejné redakčné články z `editorial-content.js` majú vlastné statické stránky pod
`/clanky/<id-bez-hf->/`. Sú viditeľné aj bez JavaScriptu a majú vlastné
`title`, `description`, `canonical`, štruktúrované údaje BlogPosting a
normálne odkazy. Slogan projektu je „Rodinná semenná farma“.

## Ako aktualizovať obsah

1. Uprav redakčný zdroj `editorial-content.js`.
2. Spusť `node scripts/generate-seo.mjs --write`.
3. Commitni aktualizované súbory v `clanky/` a `sitemap.xml`.
4. CI automaticky kontroluje súlad pomocou `--check` a zabráni tomu, aby zmeny
   redakčného zdroja potichu nechali neaktuálnu sitemap.
5. Nový súbor sitemap sa potom publikuje na GitHub Pages.

**Pozor na Supabase:** redakčné články upravené výlučne v administrácii
Supabase sa na statické HTML neprepisujú automaticky. Tento bezpečný export
vytvára stránky výhradne z verejného redakčného zdrojového súboru.
Súkromné/nezverejnené odrody, zásoby, ceny ani údaje objednávok sa neexportujú.
Pred aktualizáciou článku, ktorý bol medzičasom upravený v Supabase, zosúlaď
najprv jeho verejný text so zdrojovým súborom, aby statická verzia nebola zastaraná.
Samostatné stránky pre odrody vyžadujú dôveryhodný export aktuálnych verejných
odrôd zo Supabase a kontrolu ich viditeľnosti.

Pre články vytvorené výlučne v administrácii zatiaľ zostáva interaktívny blog.

## Profily odrôd zo Supabase

Automatická synchronizácia `.github/workflows/sync-varieties.yml` pravidelne načíta len aktuálne údaje Supabase (`sections` a `varieties`) cez verejný kľúč a vyberie výhradne odrody a sekcie s `hidden === false`. Vytvorí jednotlivé HTML profily v `/odrody/`, archív, verejný manifest a aktualizovaný sitemap.

V profiloch sú iba vlastnosti, opis a fotografie; **neuvádzajú sa ceny, sklad, údaje o dopytoch ani interné nastavenia**. Aktualizácia sa vykonáva každých šesť hodín alebo ručným spustením workflow. Skrytá odroda sa pri ďalšej úspešnej synchronizácii odstráni zo súborov (dočasná cache CDN alebo Google môže existovať). Žiadne rezervácie ani zásoby sa tým nemenia.
