# Pripravujeme – bezpečná príprava nových odrôd (november 2026)

Sekcia **📝 Pripravujeme** sa nachádza iba v hornej administračnej lište Herba et Fructus. Slúži na bezpečné uchovávanie nových odrôd, opisov, fotografií a vlastností ešte pred zverejnením. Rozpracovaný obsah nesmie byť prístupný návštevníkom ani anonymnému prístupu k Supabase.

## 1. Jednorazové zapnutie v Supabase

**Toto musí vykonať oprávnený správca Supabase Dashboardu:**

1. Otvor [Supabase Dashboard](https://supabase.com/dashboard), vyber databázový projekt Herba et Fructus.
2. V menu otvor **SQL Editor → New query**.
3. Na GitHube otvor [SUPABASE_PRIPRAVUJEME.sql](SUPABASE_PRIPRAVUJEME.sql). Skopíruj obsah a spusti **Run**.
4. Skontroluj, že tabuľka `public.site_drafts` existuje a má zapnuté RLS s politikami `authenticated` len pre UUID správcu; `anon` nemá oprávnenia čítania.
5. Obnov web, prihlás sa ako správca a klikni **📝 Pripravujeme**. Kartu možno otvoriť až pri úspešnom načítaní súkromných konceptov.

Ak sa zobrazí upozornenie na nedostupnú súkromnú tabuľku, **nové koncepty sa neukladajú**. Nejde o chybu pri publikovaní webu, ale chýba jednorazové bezpečné nastavenie. Nepridávaj koncepty do verejného katalógu iba s príznakom `hidden`: údaje v pôvodnej tabuľke `site_content` sú pre anonymný prístup čitateľné.

## 2. Príprava odrody

1. V administrácii klikni **📝 Pripravujeme → + Pripraviť novú odrodu**.
2. Vyplň aspoň jedinečný **názov**. Typ a farba môžu zostať **Neurčené**; cenu a počet semien možno doplniť neskôr; sklad môže byť 0. Odroda zostáva skrytá.
3. Postupne doplň hmotnosť, pôvod, opis, galériu a fotografie. Fotografie sa nahrávajú do existujúceho bucketu `site-images`; ak ich nahratie zlyhá, koncept sa neuloží ako úspešný.
4. Klikni **Uložiť**. Koncept sa uloží **len** do súkromnej tabuľky `site_drafts` cez prihláseného správcu. Neobjaví sa v katalógu, dopyte, verejnom manifeste ani sitemap.
5. Rozpracovanú položku otvor cez **✏️ Upraviť** a pokračuj. Po kliknutí „Uložiť cieľovú kategóriu“ je vybraná kategória iba pracovný údaj: **zatiaľ nezverejňuje**.

## 3. Zverejnenie

1. Po dopracovaní v zozname **Pripravujeme** vyber cieľ: napr. **Paradajky** alebo **Tekvice a cukety**.
2. Kartu nemožno zverejniť, ak chýba názov, konkrétny typ/farba, aspoň 120 znakov opisu, HTTPS hlavná fotografia, kladná cena, platný počet semien a nezáporný celý sklad. To sú technické minimá, nie potvrdenie správnosti údajov.
3. Klikni **✓ Zverejniť**, pozorne si prečítaj potvrdenie a schváľ ho.
4. Aplikácia uloží nový verejný záznam do katalógu **až po potvrdení cloudového zápisu**. Potom sa pokúsi odstrániť koncept zo súkromnej tabuľky. Ak čistenie zlyhá, upozorní ťa a záznam zostane v Pripravujeme na kontrolu; opätovnému zverejneniu bráni kontrola duplicitného názvu.
5. Automatická synchronizácia verejných SEO profilov prebieha približne **každých šesť hodín**. Nový verejný profil nie je nutne okamžite zaradený do Google.

Pozor: Súčasné štítky „zberateľské semená“ samy osebe neriešia zákonné požiadavky na poskytovanie osiva. Viac v [Právne overenie](PRAVNE_OVERENIE_PRE_SPRAVCU.md).

## 4. Rozšírené profily s viacerými zdrojmi

V súbore [variety-research.json](variety-research.json) sú momentálne samostatné dopĺňajúce texty pre **22 odrôd**. Každý záznam obsahuje aspoň dve explicitné externé referencie a viac odsekov. Tieto texty sa zobrazujú pod pôvodným opisom v katalógovom detaile a v statickom SEO profile.

**Úmyselne nesplývajú** s vlastnými pestovateľskými údajmi v Supabase. Neoverené údaje o výnose, odolnosti, pôvode konkrétneho osiva ani farebnej identite odrody sa nesmú vydávať za výsledky pestovania na našej farme. Napríklad „Red Pear“ môže označovať rozdielne línie a „Hokkaido“ je širšie typové označenie. Najlepšie je doplniť vlastné fotografie a pestovateľské merania priamo do administrácie, keď sú overené.

Zvyšných **29 verejných profilov** zatiaľ používa pôvodný opis a vlastnosti správcu bez automaticky vymyslených informácií.

## 5. Automatické testy a obmedzenia

- Testy `tests/draft-varieties.mjs` simulujú autentifikáciu, súkromnú tabuľku, zamietnutý zápis, dvojité názvy a publikovanie až po úspešnom uložení.
- `tests/variety-research.mjs` preveruje počet zdrojov a pripojenie redakčných textov k zodpovedajúcej odrode.
- CI test v Chromiu preveruje, že rozšírený opis a zdrojové odkazy vidí návštevník bez prihlásenia; súkromná staging karta zostáva neprístupná.
- **Testy nenahrádzajú skutočné overenie Supabase RLS a nahrávania v prihlásenej administrácii.** Po spustení SQL vykonaj jeden vlastný pokus: vytvor neúplný koncept, ulož, obnov stránku, over, že zostal rozpracovaný; zverejni ho iba na test po doplnení všetkých údajov.
