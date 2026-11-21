# Herba et Fructus – generátor 3D záhradných zápichovačov

Verejná stránka: **https://herbaetfructus.sk/3d/**

## Čo je hotové

- Vychádza z používateľského modelu **Parametric Plant Markers 5mm.scad**.
- Naraz spracuje 1–12 textov (jeden riadok = jeden štítok); používa pôvodný tvar, hrot, lem, vystúpený text, voliteľné dierky a bočné výrezy.
- Pri zmene parametrov pred exportom kontroluje rozsahy. Maximálna dĺžka textu musí vojsť do rovnej časti zápichu; výrezy a dierka sa zapínajú až od 10 mm šírky.
- Výpočet využíva skutočné OpenSCAD WebAssembly v oddelenom Web Worker a balík písma Liberation; výsledkom je binárny STL, nie iba obrázok alebo premenovaná prípona.
- Po vygenerovaní zobrazuje otáčateľný 3D náhľad (Three.js) a tlačidlo na stiahnutie STL; SCAD zdroj s nastaveniami je možné stiahnuť samostatne.
- Odkaz v hlavnej navigácii sa zobrazuje, ak verejné nastavenie \`generatorPaused\` nie je \`true\`.
- V **Admin → Zobrazenie webu** je prepínač „Pozastaviť / Zobraziť 3D generátor“. Ukladá sa do existujúceho \`settings\` v Supabase bez prepisovania cien, skladu, obrázkov alebo nastavení objednávok.
- Pri otvorení priamej adresy \`/3d/\` sa nastavenie načíta zo Supabase a pri pozastavení sa nástroj neaktivuje. Ak sa stav nedá overiť, generátor sa bezpečne nespustí.

## Použitie

1. Otvorte \`/3d/\` a zadajte názvy rastlín, jeden na každý riadok.
2. Nastavte rozmery, písmo a prípadne pokročilé výrezy.
3. Kliknite **Vytvoriť 3D náhľad**. Počíta sa priamo vo vašom prehliadači.
4. Prezrite model otočením a priblížením v 3D.
5. Kliknite **Stiahnuť STL model** a otvorte súbor v PrusaSliceri, OrcaSliceri či Bambu Studio.
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
