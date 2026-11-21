# Herba et Fructus – generátor 3D záhradných zápichovačov

Verejná stránka: **https://herbaetfructus.sk/3d/**

## Čo je hotové

- Vychádza z používateľského modelu **Parametric Plant Markers 5mm.scad**.
- Naraz spracuje 1–60 textov (jeden riadok = jeden štítok), po najviac 12 modelov v každej dávke; používa pôvodný tvar, hrot, lem, vystúpený text, voliteľné dierky a bočné výrezy.
- Pri zmene parametrov pred exportom kontroluje rozsahy. Maximálna dĺžka textu musí vojsť do rovnej časti zápichu; výrezy a dierka sa zapínajú až od 10 mm šírky.
- Výpočet využíva skutočné OpenSCAD WebAssembly v oddelenom Web Worker a balík písma Liberation; výsledkom je binárny STL, nie iba obrázok alebo premenovaná prípona.
- Po vygenerovaní zobrazuje otáčateľný 3D náhľad prvej dávky (Three.js). Pri najviac 12 názvoch stiahne STL, pri 13–60 názvoch pripraví jeden ZIP s viacerými STL (12/12/6 pri 30 názvoch). Rovnaké dávky možno stiahnuť aj ako SCAD ZIP.
- Odkaz v hlavnej navigácii sa zobrazuje, ak verejné nastavenie \`generatorPaused\` nie je \`true\`.
- V **Admin → Zobrazenie webu** je prepínač „Pozastaviť / Zobraziť 3D generátor“. Ukladá sa do existujúceho \`settings\` v Supabase bez prepisovania cien, skladu, obrázkov alebo nastavení objednávok.
- Pri otvorení priamej adresy \`/3d/\` sa nastavenie načíta zo Supabase a pri pozastavení sa nástroj neaktivuje. Ak sa stav nedá overiť, generátor sa bezpečne nespustí.

## Použitie

1. Otvorte \`/3d/\` a zadajte názvy rastlín, jeden na každý riadok.
2. Nastavte rozmery, písmo a prípadne pokročilé výrezy.
3. Kliknite **Vytvoriť 3D náhľad**. Počíta sa priamo vo vašom prehliadači.
4. Prezrite model otočením a priblížením v 3D.
5. Kliknite **Stiahnuť STL model** (najviac 12 názvov), alebo **Stiahnuť STL súbory (ZIP)** (viac než 12 názvov). Všetky dávky spracujte v PrusaSliceri, OrcaSliceri či Bambu Studio.
6. Pri dvojfarebnej tlači nastavte zmenu filamentu v Z vrstve zodpovedajúcej *hrúbke základne* (predvolene 2,5 mm); **STL neobsahuje farby**.

## Technické a prevádzkové hranice

- Zdroj \`3d/model/plant-markers.scad\` je textový OpenSCAD model, ktorého upravené hodnoty sa do WASM posielajú cez \`-D\`.
- Závislosti 3D náhľadu: Three.js \`0.167.0\` a STLLoader; OpenSCAD: \`@lofcz/openscad-wasm@0.0.2\` vrátane Liberation písiem; prehliadač ich sťahuje z jsDelivr. Pre prevádzku je potrebné pripojenie na CDN.
- Podporované písma v generátore: Liberation Sans a Liberation Serif (tučné). Na rozdiel od pôvodného súboru nie sú cez tento webový variant sprístupnené DejaVu ani Courier, keďže nie sú dodané s používaným WASM balíkom.
- STL zachováva geometriu a nemá farby ani nastavenia slicera. Nástroj nie je automatický validátor mechanickej pevnosti: pri dlhých, úzkych zápichoch treba dbať na materiál a orientáciu pri tlači.
- Správcovské „pozastavenie“ nie je serverové blokovanie prístupu k verejnému zdrojovému súboru na statickom hostingu. Je to kontrola dostupnosti vo verejnom rozhraní; už stiahnuté STL súbory nemožno odvolať.
- Nové rendrovanie vytvára novú inštanciu Web Worker, aby sa oddelil proces OpenSCAD; zmena vstupov rozpracovaný výpočet zruší. Výpočet sa po 180 sekundách ukončí.

## Testovanie

\`node --test tests/generator-3d.mjs\` – kontrola UI, JavaScript syntaxe, modelu a zachovania pôvodných nastavení.

Workflow \`.github/workflows/test-generator-3d.yml\`:
- nainštaluje pripnutý WebAssembly modul,
- spustí \`node scripts/verify-generator-3d.mjs\` a vytvorí reálne STL s diakritikou,
- spustí Chromium pre overenie formulára, náhľadu, stiahnutia súboru a pozastavenia pri priamom otvorení.

Súčasné testy katalógu a objednávok zostávajú nezmenené.

## Prepojenie s katalógom a pozastavenie

- Karta odrody aj detail odrody majú odkaz na generátor s predvyplneným názvom (`/3d/?odroda=...`).
- Verejné SEO profily majú rovnaký odkaz, ktorý sa odkryje až po overení nastavenia `generatorPaused` zo Supabase.
- Zákazník môže zo súhrnu výberu poslať 30 či viac **rôznych** vybraných odrôd jedným tlačidlom. Prenášajú sa len názvy (nie ceny, zásoby, e-mail ani osobné údaje). Každá odroda vytvorí jeden štítok nezávisle od počtu balení semien.
- Na prenos výberu slúži `sessionStorage`; pri nedostupnom úložisku sa použije URL s názvami. Pri opätovnom načítaní prázdneho generátora sa pôvodný nákupný košík nemení.
- Správca používa už existujúci prepínač **Admin → Zobrazenie webu → Pozastaviť 3D generátor**. Skryje odkazy z kariet, detailu, súhrnu aj verejných SEO profilov; samostatná stránka odmietne spustenie. Stav sa kontroluje aj pred generovaním každej ďalšej dávky a pred stiahnutím STL.
- Každé generovanie 30 názvov vytvorí tri nezávislé STL s najviac 12 kusmi na jeden súbor. ZIP má aj `CITAJ-MA.txt` s informáciou o dávkach.
- Testovanie: `node --test tests/marker-bulk.mjs` a Chromium test `scripts/browser-test-generator.mjs` (skutočné binárne STL + ZIP s 30 názvami).
