# Herba et Fructus – stav a ďalší postup (22. november 2026)

Tento dokument je technický pracovný súhrn. Neznamená potvrdenie právnej
pripravenosti na predaj semien alebo skutočnej e-mailovej doručiteľnosti.

## Hotové úpravy bez potreby zásahu do Supabase

- **Výber odrôd v prehliadači:** bez registrácie sa zapisuje len názov a počet
  balení do `localStorage['herba_cart_v1']`. Nezapisuje sa e-mail, meno,
  adresa, cena, sklad ani zákaznícky dopyt.
- **Obnova po obnovení stránky:** až po načítaní katalógu zo Supabase; tým
  sa ešte pred obnovením neprepíše uložený výber prázdnym košíkom.
  Skryté, neexistujúce a vypredané odrody sa neobnovia a množstvo sa
  upraví podľa aktuálneho skladu.
- **Vymazanie výberu:** v súhrne formulára je tlačidlo
  „Vymazať celý výber“ a vysvetlenie lokálneho uloženia.
- **3D generátor:** pôvodná obnova cez sessionStorage zostáva funkčná,
  spolu s trvalejšou obnovou pri bežnej návšteve katalógu.
- **Dokončenie dopytu:** až pri návrate z FormSubmit na
  `/dakujeme.html` so značkou platného nedávneho odoslania sa uložený
  výber vymaže. Priame otvorenie ďakovnej stránky ho nezmaže.
  Návrat tlačidlom Späť nesmie obnoviť starý košík z histórie.
- **Redakčné odporúčania:** Admin → Prehľad správcu má nový údaj
  a filter „Krátky opis (menej než 180 znakov)“. Ide len o signál,
  aby bolo jednoduché nájsť odrody, ktorých pôvodný opis stojí za dopracovanie.
  Nie je to kritérium ani automatické hodnotenie vyhľadávača.
  Nevymýšľajú sa nové odrodové vlastnosti.

Tieto zmeny používajú len zmeny HTML, CSS a JavaScript v GitHube,
**nemenia** žiadne riadky v Supabase. Pôvodné ceny, fotografie, sklad,
administrácia, prepínače dostupnosti formulára a 3D generátora zostávajú.

## Automatické overenie

- `node --test tests/*.mjs` – zdrojový kód a pravidlá aplikácie,
  vrátane `tests/cart-persistence.mjs` a
  `tests/enhancements-smoke.mjs`.
- `node scripts/generate-varieties.mjs --check` a
  `node scripts/generate-seo.mjs --check` – statické stránky a sitemap.
- `scripts/browser-test-mobile-cards.mjs` v GitHub Actions –
  skutočný Chromium na mobilných rozmeroch 320 a 390 px a na desktope,
  výber 30 odrôd, opätovné načítanie, kontrola skladu a formulára.
  Scenár používa falošné údaje a **neodosiela** reálny dopyt cez FormSubmit.

## Čo musí overiť správca alebo doplniť z vlastných zdrojov

1. **Skutočné doručenie dopytu:** odošli jeden vlastný nezáväzný test
   v produkčnom formulári a skontroluj doručenie do cieľovej
   e-mailovej schránky a presmerovanie na `/dakujeme.html`.
   Automatizované kontroly tretieho e-mailového poskytovateľa toto
   nenahrádzajú. Pri testovaní použi vlastné kontaktné údaje.
2. **Bezpečnosť Supabase:** v projekte skontroluj naozaj aktívne RLS
   politiky tabuľky `site_content`, role pre anonymných návštevníkov
   a Storage bucketu `site-images`. SQL súbory v repozitári sú návrhom
   a nie dôkazom nasadenia.
3. **Právny režim:** pred pravidelným prijímaním platieb či posielaním
   osiva konzultuj požiadavky ÚKSÚP, podmienky uvádzania osiva na trh,
   prípadnú registráciu činnosti, informácie pre spotrebiteľov a dane.
   Nápis „zberateľské“ sám osebe neznamená zákonnú výnimku.
4. **Vlastný obsah odrôd:** najprv dopracovať približne 10 hlavných
   profilov o overené údaje, pestovateľské skúsenosti, kvalitné
   fotografie plodov a rastlín. Nepridávať vymyslenú chuť, výnos,
   odolnosť ani pôvod len na naplnenie počtu slov.
5. **SEO a výkon:** sledovať indexáciu `/odrody/` a odrodových profilov
   cez Search Console. Pred ďalšími veľkými úpravami urobiť mobilné
   meranie Lighthouse/PageSpeed na verejnej produkčnej URL. Zvážiť
   meranie návštevnosti pri súlade s ochranou súkromia.

## Funkčné obmedzenia

- `localStorage` je **len v aktuálnom zariadení a prehliadači**.
  Nenosí výber na iný telefón a môže byť blokované súkromným režimom.
- Ak sa zásoby medzi návštevami zmenia, obnovený počet balení sa
  bezpečne zníži na aktuálny dostupný počet.
- GitHub Pages nemá serverovú objednávkovú validáciu. Pozastavenie
  verejného formulára v rozhraní neblokuje priame požiadavky na
  tretiu službu FormSubmit; vymáhanie stavu na serveri by
  vyžadovalo vlastný backend.
- SEO audit nenahrádza kontrolu odbornosti tvrdení a výsledky
  indexácie Google sa nemusia prejaviť okamžite.

## Príklad rýchlej kontroly na telefóne

Otvoriť stránku → Paradajky → pridať 3 rôzne odrody, pri jednej
zvoliť 2 balenia → obnoviť stránku → otvoriť Paradajky a skontrolovať
množstvá a zelené označenie → prejsť do 3D dielne a späť →
použiť „Vymazať celý výber“ → overiť, že výber zostane prázdny
aj po ďalšom obnovení. Samostatne potom spraviť vlastný test dopytu
a e-mailovej doručiteľnosti.
