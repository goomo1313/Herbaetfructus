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

## 4. Pôvodné opisy odrôd bez prídavných externých textov

Verejný katalóg aj statické SEO profily zobrazujú pôvodný opis a vlastnosti,
ktoré správca uložil v Supabase. Samostatné viacodsekové texty a výpisy
externých zdrojov boli na želanie správcu odstránené. Nevracajú sa ani
po opätovnom generovaní verejných profilov. Rozpracované nové opisy ostávajú
len v súkromnej sekcii Pripravujeme až do ich schválenia.

## 5. Automatické testy a obmedzenia

- Testy `tests/draft-varieties.mjs` simulujú autentifikáciu, súkromnú tabuľku, zamietnutý zápis, dvojité názvy a publikovanie až po úspešnom uložení.
- `tests/original-variety-descriptions.mjs` overuje pôvodné opisy a zabraňuje opätovnému pridaniu zrušenej obsahovej vrstvy.
- CI test v Chromiu overuje pôvodný opis bez zrušeného bloku externých textov; súkromná staging karta zostáva neprístupná.
- **Testy nenahrádzajú skutočné overenie Supabase RLS a nahrávania v prihlásenej administrácii.** Po spustení SQL vykonaj jeden vlastný pokus: vytvor neúplný koncept, ulož, obnov stránku, over, že zostal rozpracovaný; zverejni ho iba na test po doplnení všetkých údajov.


## Prehľad správcu a hromadné 3D štítky

V administračnej lište otvor **📊 Prehľad správcu**. Hore vyber zdroj:
**🌿 Zverejnené** (verejne viditeľné odrody), **📝 Pripravujeme**
(súkromné koncepty z `site_drafts`) alebo **📋 Celý katalóg vrátane skrytých**.
Vyhľadávanie, diagnostika a editácia sa automaticky prispôsobia zvolenému
zdroju. Pri koncepte tlačidlo **✏️ Upraviť** otvorí priamo jeho súkromný
editor; samotné prepnutie nikdy nič nezverejní. Ak autentifikované
načítanie konceptov zlyhá, zobrazí sa chyba, nie verejné údaje namiesto nich.

**🛠️ Hromadné operácie → označ odrody → 🖨️ 3D štítky k označeným.**
Prenesie sa 1–60 názvov do bezplatného 3D generátora a tam možno stiahnuť
STL alebo ZIP; pri pozastavenom generátore je tlačidlo zablokované.
Táto akcia **neukladá žiadnu hromadnú zmenu do Supabase**, nezasahuje
do cien ani do zákazníckeho výberu semien. Súkromné koncepty sa do
hromadného výberu verejného katalógu nepridávajú.
