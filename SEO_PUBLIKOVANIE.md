# SEO články – Herba et Fructus

Verejné redakčné články z `editorial-content.js` majú vlastné statické stránky pod
`/clanky/<id-bez-hf->/`. Sú viditeľné aj bez JavaScriptu a majú vlastné
`title`, `description`, `canonical`, štruktúrované údaje BlogPosting a
normálne odkazy. Označenie projektu je „Osobný projekt“.

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

## SEO generátora 3D záhradných štítkov

Verejná stránka `https://herbaetfructus.sk/3d/` má samostatný popisný titulok,
meta popis, kanonickú adresu, Open Graph a Twitter metadata, JSON-LD
`WebApplication` (bez vymyslených hodnotení) a `BreadcrumbList`.
Obsahuje indexovateľný vysvetľujúci HTML návod a FAQ: generovanie STL,
štítky na paradajky/bylinky, 3D tlač, výmena farby, PETG a PLA.
Používateľské nástroje zostávajú oddelené od indexovateľného textu.

Kanonická URL `/3d/` je v `sitemap.xml` a v zdrojovom generátore
`scripts/generate-seo.mjs`, aby ju ďalšia automatická synchronizácia
neodstránila. `robots.txt` povoľuje jej prehľadávanie. Na hlavnej
stránke je skutočný odkaz `href="/3d/"`, ktorý sa zobrazuje len po
úspešnom načítaní verejných nastavení a len keď správca generátor
nepozastavil. Navigácia používa odkaz namiesto JS tlačidla.
Generátor má tiež odkazy na katalóg, články a príklady odrôd.

**Pozastavenie generátora nie je to isté ako zakázanie indexácie.**
Pri pozastavení sa vypnú ovládacie prvky a odkazy, ale verejný návod
a stránka zostanú čitateľné; Google si môže ponechať už nájdenú adresu.
To je zámer, aby krátkodobé pozastavenie nepoškodilo dlhodobé SEO.

### Overenie v Google Search Console

1. Otvor vlastníctvo `herbaetfructus.sk` v Google Search Console.
2. V poli **Kontrola adresy URL** zadaj presne `https://herbaetfructus.sk/3d/`.
3. Použi **Otestovať živú adresu URL** a pri úspešnom načítaní
   **Požiadať o indexovanie**. Toto je požiadavka Googlu, nie záruka zaradenia.
4. V sekcii **Súbory sitemap** skontroluj odoslanie
   `https://herbaetfructus.sk/sitemap.xml` a stav spracovania.
5. Výsledok je možné neskôr skontrolovať v prehľade indexácie stránok
   a cez vyhľadávanie `site:herbaetfructus.sk/3d/`.

Zmeny overujú `tests/generator-seo.mjs` a aktualizovaná kontrola sitemap
v `tests/seo-static-pages.mjs` spolu s `node scripts/generate-seo.mjs --check`.
Indexovanie do Googlu nemôže za web garantovať ani spustiť samotný kód.


## Vyhľadávanie „semená paradajok“

Hlavná verejná adresa `https://herbaetfructus.sk/` má vlastný canonical.
SEO titulok a viditeľný úvod používajú prirodzene výraz „semená paradajok“,
pričom /odrody/ a /clanky/ poskytujú verejné opisy a pestovateľské rady.
Nevytvárame duplicitnú cieľovú stránku pre tú istú vyhľadávaciu frázu.

Na Google Search Console skontroluj indexovanie hlavnej HTTPS adresy,
odoslanie `https://herbaetfructus.sk/sitemap.xml` a výkon pre dopyty
„semená paradajok“, „zberateľské semená paradajok“ či konkrétne odrody.
Správne značky a sitemap **nezaručujú** indexovanie ani pozíciu vo vyhľadávaní.
Obsah a zoznamy musia zostať pravdivé; nevytvárať falošné recenzie, skladové
zásoby ani nereálne ponuky.
