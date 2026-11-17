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
Samostatné stránky pre odrody sa už vytvárajú samostatným, bezpečne filtrovaným
exportom zo Supabase, ktorý preveruje ich aktuálnu viditeľnosť.

Pre články vytvorené výlučne v administrácii zatiaľ zostáva interaktívny blog.

## Profily odrôd zo Supabase

Automatická synchronizácia `.github/workflows/sync-varieties.yml` pravidelne načíta len aktuálne údaje Supabase (`sections` a `varieties`) cez verejný kľúč a vyberie výhradne odrody a sekcie s `hidden === false`. Vytvorí jednotlivé HTML profily v `/odrody/`, archív, verejný manifest a aktualizovaný sitemap.

V profiloch sú iba vlastnosti, opis a fotografie; **neuvádzajú sa ceny, sklad, údaje o dopytoch ani interné nastavenia**. Aktualizácia sa vykonáva každých šesť hodín alebo ručným spustením workflow. Skrytá odroda sa pri ďalšej úspešnej synchronizácii odstráni zo súborov (dočasná cache CDN alebo Google môže existovať). Žiadne rezervácie ani zásoby sa tým nemenia.

## Navigácia a objavovanie odrôd

- Verejný archív `/odrody/` obsahuje vyhľadávanie názvov bez ohľadu na diakritiku, filtrovanie podľa aktuálne verejných skupín a informáciu o počte výsledkov.
- Profily prepájajú ďalšie viditeľné odrody **iba v rovnakej skupine** a odkazujú na existujúce tematické články. Neprisudzujú odrodám nevypísané vlastnosti.
- Vyhľadávanie je doplnková funkcia; pri vypnutom JavaScripte zostávajú všetky odkazy prístupné.
- Po zmene viditeľnosti v administrácii sa statické HTML a manifest aktualizujú pri najbližšej úspešnej synchronizácii (plán každých 6 hodín).
- Pri súčasných zmenách na GitHube sa publikovanie pokúsi bezpečne zlúčiť novšie commity. Nikdy nepoužíva násilný push.
- Testy `tests/variety-archive.mjs`, `tests/variety-discovery.mjs` a `tests/seo-variety-profiles.mjs` kontrolujú navigáciu, ochranu skrytých údajov a generovanie profilov.
