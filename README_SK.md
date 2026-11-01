# Herba et Fructus – web s online databázou

Stránka je statická (GitHub Pages), ale jej obsah sa ukladá do databázy **Supabase**. Po úprave odrody, skladu, kategórie alebo článku sa zmena uloží online. Nie je potrebné sťahovať ani opätovne nahrávať `index.html`.

## Čo je v projekte

- `index.html` – web a administrácia.
- `config.js` – verejná konfigurácia Supabase.
- `supabase_setup.sql` – SQL skript na vytvorenie databázy a bezpečnostných pravidiel.
- `README_SK.md` – tento návod.

## 1. Nastavenie databázy Supabase

Projekt Supabase je už nakonfigurovaný v `config.js`. Databázová tabuľka sa vytvorí takto:

1. Prihláste sa na [Supabase](https://supabase.com/) a otvorte projekt Herba et Fructus.
2. V ľavom menu otvorte **SQL Editor**.
3. Vyberte **New query**.
4. Na GitHube otvorte súbor `supabase_setup.sql`.
5. Skopírujte celý jeho obsah do SQL Editora v Supabase.
6. Kliknite na **Run**.
7. Výsledok má potvrdiť vytvorenie tabuľky `site_content`. Posledný kontrolný SELECT môže zatiaľ vrátiť nula riadkov – je to v poriadku.

Skript vytvorí jednu tabuľku pre obsah webu a zapne Row Level Security (RLS):
- návštevníci môžu obsah iba čítať,
- zapisovať a meniť obsah môže iba prihlásený správca s nakonfigurovaným UUID,
- verejný kľúč v `config.js` nemá oprávnenie obísť tieto pravidlá.

## 2. Prvý prenos údajov do cloudu

Po spustení SQL:

1. Otvorte zverejnenú stránku Herba et Fructus.
2. Obnovte stránku (ideálne Ctrl + F5).
3. Prihláste sa v administrácii e-mailom a heslom správcu.
4. Pri prvom prihlásení administrácia automaticky prenesie aktuálne kategórie, odrody, články a nastavenia do Supabase.
5. V Supabase otvorte **Table Editor → site_content**. Mali by sa zobraziť štyri riadky: `sections`, `varieties`, `blog`, `settings`.

Ak sa štyri riadky nevytvoria, skontrolujte chybu zobrazenú na stránke a výsledok SQL skriptu. Nespúšťajte opakované importy naslepo.

## 3. Ako teraz funguje administrácia

- **Odrody, kategórie a články:** zmena sa uloží do Supabase.
- **Sklad:** zmena počtu kusov sa uloží online a návštevníci uvidia aktuálne údaje po obnovení stránky.
- **Nastavenie e-mailu:** uloží sa do databázy spolu s ostatnými nastaveniami.
- **Obnoviť:** vráti obsah databázy na predvolené údaje vložené v aktuálnom kóde.
- **Uložiť do cloudu:** ručne uloží všetky štyri časti obsahu. Už nevytvára HTML súbor.
- **Import JSON:** importované údaje sa odošlú do online databázy.

Zmeny sa ukladajú do databázy, nie do súboru HTML. Aktualizácia stránky preto nevyžaduje nový upload na GitHub.

## 4. Konfigurácia a bezpečnosť

V `config.js` sú tieto verejné hodnoty:
- `supabaseUrl` – adresa projektu.
- `supabaseAnonKey` – verejný publishable/anon kľúč.
- `adminUserId` – UUID jediného používateľa oprávneného meniť obsah.

**Nikdy nevkladajte do `config.js` heslo správcu ani Supabase `service_role` / secret key.** Verejný kľúč je určený pre webový prehliadač; bezpečnosť zápisu zabezpečujú pravidlá RLS v databáze.

Správca musí byť vytvorený v Supabase → **Authentication → Users**. Vypnite verejnú registráciu používateľov, ak ju nepotrebujete.

## 5. Publikovanie webu

Kód je v GitHub repozitári `goomo1313/Herbaetfructus`. Pri každej zmene kódu (napríklad dizajn alebo nová funkcia) sa aktualizuje GitHub. Bežné zmeny obsahu stránky sa však ukladajú priamo do Supabase a nevyžadujú nový upload.

Ak používate GitHub Pages, v repozitári otvorte **Settings → Pages** a skontrolujte, že sa publikuje branch `main` z koreňového priečinka.


## 6. Automatická kontrola kvality

V repozitári je súbor `.github/workflows/test-web.yml` a sada testov `tests/site-smoke.mjs`.
GitHub Actions pri každom nahratí nového kódu do `main` overí obe sady testov (`tests/site-smoke.mjs` a `tests/editorial-smoke.mjs`):

- syntaktickú správnosť hlavného JavaScriptu a jedinečnosť identifikátorov v HTML,
- zachovanie všetkých 52 pôvodných produktov, ich predvolených cien, 2 balení na sklade a 10 semien v balení,
- dostupnosť sekcie Náš príbeh,
- správne blokovanie prázdnych objednávok a množstiev nad zásobami,
- sčítavanie balení, obmedzenie počtu balení a obnovu JSON bez nepovoleného záznamu `story`.

Výsledok je v **GitHub → Actions → Kontrola webu Herba et Fructus**. Úspešný test kódu ešte
nezaručuje, že je nová verzia zverejnená; samostatne skontrolujte aj úlohu
**pages build and deployment**. Automatické testy neodosielajú skutočné objednávky
a nevykonávajú prihlásenie reálneho správcu do Supabase.

## 7. Dôležité pravidlá pri správe dát

- **Pred väčšími zmenami** v administrácii kliknite na **Zálohovať JSON**. Záloha obsahuje karty, odrody, sklad, blog a nastavenia.
- Import JSON nahrádza štyri podporované časti databázy: `sections`, `varieties`, `blog` a `settings`. Staré pole `story` sa pri importe ignoruje, pretože príbeh je dnes súčasťou karty `domov`.
- Ak zápis niektorej časti importu zlyhá, web sa pokúsi vrátiť predchádzajúce údaje. Supabase z prehliadača **neposkytuje jednu atómovú transakciu pre celý import**; pri prerušení pripojenia preto vždy skontrolujte výsledok.
- Revízia katalógu zo dňa 1. 11. 2026 nastavila východiskovú zásobu na **2 balenia** a obsah balenia na **10 semien**. Pri existujúcej databáze sa jednorazová úprava trvalo uloží až po prihlásení oprávneného správcu. Neskoršie zmeny skladu sa už vykonávajú bežne v administrácii.
- Predvolené nové odrody majú zásobu 2 balenia a 10 semien. Administrácia teraz overuje duplicity názvov, kladnú cenu, celé nezáporné zásoby a bezpečnú adresu fotografie.
- **Objednávka je nezáväzný dopyt**, ktorý sa posiela cez FormSubmit. Odoslanie neodpočítava sklad; zásoby sa upravujú ručne po vybavení objednávky.

## 8. Redakčný obsah a odborné články (november 2026)

Web obsahuje samostatný súbor `editorial-content.js` s desiatimi tematickými článkami.
Každý článok obsahuje názov, rubriku, krátky úvod (perex), orientačný čas čítania,
nadpisy, postupy, upozornenia a odkazy na odborné zdroje. Obsah zahŕňa:

- odoberanie, fermentáciu, sušenie a uchovávanie semien paradajok,
- výsev a predpestovanie paradajok, rastové typy a výber vhodnej odrody,
- hnilobu kvetného konca, praskanie plodov a pleseň zemiakovú,
- kríženie tekvíc a cukiet, pestovanie čučoriedok v nádobách,
- prípravu pôdy, záhradný denník, pestovanie s deťmi a hybridy F1.

**Zverejnenie bez straty údajov:** články sa pri návšteve doplnia aj vtedy,
keď Supabase obsahuje staršie články. Pôvodné ukážkové články sa nahradia len
vtedy, keď zodpovedajú starému krátkemu vzoru. Iné a upravené príspevky ostávajú.
Po najbližšom prihlásení oprávneného správcu web nové články jednorazovo uloží
do riadka `site_content.blog` a aktualizuje `settings.editorialReleaseId`.
Až po tomto potvrdenom cloudovom zápise je možné články v administrácii
trvalo editovať alebo odstraňovať bez ich opätovného dopĺňania z vydania.
Ak ukladanie zlyhá, web zobrazuje pôvodný obsah spolu s dočasne doplnenými článkami,
ale nepredstiera dokončený zápis.

**Editácia:** Administrácia → Blog → Upraviť. Okrem hlavného HTML obsahu
možno zmeniť rubriku, úvodný text a čas čítania. Pôvodné ID vydania a dátum
sa pri bežnej úprave zachovajú. Na verejnej stránke je vyhľadávanie,
filtrovanie podľa rubriky a rozbalenie celého článku.

Na GitHube sa spúšťa automatická sada `tests/editorial-smoke.mjs`.
Kontroluje počet článkov, ich štruktúru, HTTPS odborné odkazy,
zachovanie existujúcich príspevkov pri migrácii a filtre vyhľadávania.
Testy nenahrádzajú manuálnu kontrolu vizuálneho zobrazenia na mobile.


## 9. Detail odrody, fotografie a mobilná administrácia

V katalógu má každá odroda tlačidlo **Detail odrody a fotografie**.
Podrobné okno zobrazí pôvodný opis, názov, rastový typ, farbu, orientačnú
hmotnosť, cenu, počet semien v balení a aktuálne skladové zásoby.
Fotografie sa zobrazujú iba vtedy, keď je k odrode priradená platná HTTPS
adresa; systém **nenahrádza chýbajúce fotografie cudzími odrodami**.
U jednej odrody možno mať najviac 8 odkazov na fotografie vrátane hlavnej.

**Zdieľanie konkrétnej odrody:** tlačidlo **Zdieľať odrodu** vytvorí odkaz
v tvare `https://.../#odroda=...`. Funguje na aktuálnom GitHub Pages
hostingu aj pri budúcej vlastnej doméne, ak sa zachová príslušný web.
Ide o klientsky odkaz v rámci jednej HTML stránky, nie o samostatnú
statickú podstránku indexovanú vyhľadávačmi.

**Pridávanie fotografií bez kódu:** Prihlásenie správcu → Úprava odrody.
Vyplň hlavný HTTPS obrázok, zoznam ďalších HTTPS URL (každú na samostatný
riadok) alebo vyber z mobilu naraz až šesť fotografií (JPG, PNG, WebP).
Ak hlavná fotografia chýba, prvá nahratá sa nastaví ako hlavná.
Fotografie do 2 MB vo formáte JPEG sa uložia priamo; väčšie alebo iné
podporované formáty sa podľa schopností prehliadača prevádzajú na JPEG
s maximálnym rozmerom 1 800 px. Súbory nad 20 MB, nepodporované
formáty alebo nahrávanie pri nenakonfigurovanom úložisku sa odmietnu.
Počas nahrávania nechaj modálne okno otvorené.

**Supabase:** musí existovať verejný bucket `site-images`, v ktorom
je čítanie verejné a zápis povoľujú správne Storage RLS politiky
len oprávnenému správcovi. Práva sa nesmú otvárať anonymným návštevníkom.
Ak bucket alebo RLS nie je nakonfigurovaný, fotografie nepôjde nahrať;
HTML formulár a výber URL však zostanú dostupné. Nikdy nezadávaj
`service_role` kľúč do `config.js`.

Ceny, názvy a skladové zásoby sa pri obyčajnom otvorení detailu nemenia.

### Prepínanie spôsobu zobrazenia fotografie

Pri úprave každej odrody je pod hlavnou fotografiou voľba **Zobrazenie hlavnej fotografie**:

- **Zobraziť celú – bez orezania (predvolené):** v rámiku zostane celý záber a pri nezhodnom pomere strán sa objavia voľné okraje.
- **Vyplniť rámik – možné orezanie okrajov:** fotografia vyplní rámik, ale časť záberu môže byť skrytá.

Po zmene uvidíš živý náhľad. Nastavenie sa uloží do poľa `imageFit` príslušnej odrody pri stlačení **Uložiť** a premietne sa do katalógovej karty aj hlavnej fotografie v detaile odrody.

Pri ďalších fotografiách v galérii je vedľa každej samostatná rozbaľovacia voľba. Web uloží jej nastavenie do poľa `galleryImageFits` pod príslušnou HTTPS adresou. Tieto voľby ovplyvňujú náhľad vybranej fotografie v detaile odrody; nie je potrebné znovu nahrávať súbory. Nové galériové snímky predvolene používajú režim „Zobraziť celú“ a režim im môžeš nastaviť pri ďalšej úprave po nahratí.

Rovnaký prepínač existuje v **Administrácia → Správa kariet → Upraviť** pri obrázku sekcie „Náš príbeh“ aj ďalších obsahových kariet. Ukladá sa ako `imageFit` v zázname sekcie. Staré údaje bez nastavenia sa zobrazujú celé (`contain`).

Automatické testy kontrolujú samostatné režimy hlavnej a galériových fotografií aj to, či sa správne vykresľujú v detaile odrody. Testy nenahrádzajú skutočné otestovanie uloženia cez prihlásenie do Supabase.


## 10. Pestovateľský kalendár a FAQ

V navigácii pribudla samostatná sekcia **Pestovateľský kalendár** s dvanástimi
mesačnými odporúčaniami a siedmimi často kladenými otázkami.
Je pripravená priamo v HTML, nezasahuje do existujúcich záznamov
`site_content` a po publikovaní funguje bez prihlásenia správcu.

Kalendár je orientačný pre Slovensko: posledné mrazy, nočné teploty,
nadmorská výška a spôsob pestovania môžu termíny významne posunúť.
V úvode sú aj tlačidlá na katalóg, blog a kalendár.

Plávajúce tlačidlo **Môj výber** vedie priamo k nezáväznému objednávkovému
formuláru a je dostupné aj z klávesnice.

## 11. Automatické kontroly rozšírených funkcií

Okrem pôvodných testov boli pridané:
- `tests/catalogue-detail.mjs`: zobrazovanie detailu, galérie, skladové
  obmedzenia, kontroly administratívneho nahrávania a ochrana údajov;
- `tests/calendar-smoke.mjs`: 12 mesiacov, 7 otázok, navigácia a objednávka.

Testy spúšťa workflow `test-web.yml` pomocou `node --test tests/*.mjs`.
Nesimuluje skutočné nahrávanie fotografií do Supabase ani plný
vizuálny test v mobilnom prehliadači; tie treba overiť pri doplnení
prvých fotografií.

## 12. Zjednodušený dopytový formulár a pravidlá pre zberateľské osivo

V závere katalógu návštevník už **nemusí prezerať druhý dlhý zoznam odrôd**.
Najprv vidí svoje vybrané odrody, počet balení, orientačnú hodnotu,
tlačidlá **+ / − / Odstrániť**, potom jednoduchý nezáväzný formulár.

Pôvodný zoznam odrôd zostal funkčný ako **voliteľne rozbaľovacia**
možnosť „Chcem upraviť výber alebo pridať ďalšiu odrodu“.
Výber z katalógových kariet a detailov sa zachováva; pri zmenách sa
overuje sklad a odosiela sa aktualizovaný súhrn.

Aby formulár vopred nezhromažďoval nepotrebné údaje, vyžaduje
iba meno a e-mail, umožňuje nepovinnú správu a nežiada
doručovaciu adresu ani preferovanú platbu.
Zavádzajúci „povinný GDPR súhlas“ bol nahradený informačným textom.
Formulár naďalej používa FormSubmit, čo vyžaduje osobitné overenie
informačnej povinnosti a nastavenia ochrany osobných údajov.

Odoslanie na FormSubmit presmeruje na reálne existujúcu stránku
`dakujeme.html` (zostáva v podpriečinku GitHub Pages alebo webhostingu).
Tá výslovne uvádza, že ide len o nezáväzný dopyt, nie o zaplatenú
alebo potvrdenú objednávku.

**Právne podklady a otvorené povinnosti:**
`PRAVNE_OVERENIE_PRE_SPRAVCU.md` obsahuje oficiálne odkazy,
otázky na ÚKSÚP, rozlíšenie príležitostných príjmov od podnikania,
upozornenia k ochrane spotrebiteľa a k GDPR.
Je pripravený aj návrh otázky na ÚKSÚP.

**Dôležité:**
- Zberateľský charakter semien *sám osebe neznamená výnimku*
  z pravidiel uvádzania osiva zelenín na trh.
- Daňové oslobodenie vybraných príležitostných príjmov do 500 €
  *nie je automatické povolenie na pravidelný predaj bez oprávnenia*.
- Bez odpovede ÚKSÚP, posúdenia druhu činnosti a doplnenia
  skutočných údajov prevádzkovateľa nemožno web označiť za
  plne právne pripravený na sústavný komerčný predaj.
- Nebol pridaný fiktívny obchodník, vymyslené IČO, vyhlásenie
  o certifikácii osiva ani nepravdivé podmienky reklamácií.

Nové automatické testy `tests/inquiry-legal.mjs` overujú poradie
súhrnu a voliteľného editora, zmeny množstva, výmaz položiek,
minimalizáciu údajov a odkaz na potvrdzovaciu stránku.

## Poznámky

- **Fotografie:** správca môže vkladať URL alebo nahrávať súbory priamo pri kartách aj odrodách. Galérie odrôd majú vlastný editor a zmenšovanie obrázkov. Fotografie blogu sa zatiaľ nastavujú cez HTTPS URL. Bucket `site-images` musí mať bezpečné RLS politiky.
- Objednávkový formulár naďalej používa existujúce nastavenie FormSubmit. Databázové ukladanie objednávok zatiaľ nie je súčasťou tejto úpravy.
- Pri prvom spustení sa do cloudu prenesú údaje dostupné v prehliadači, z ktorého sa správca prvýkrát prihlási. Ak ste v minulosti upravovali obsah iba v inom prehliadači alebo zariadení, najprv z neho vyexportujte JSON a použite Import JSON po nastavení databázy.
