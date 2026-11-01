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

## Poznámky

- **Fotografie kariet:** v administrácii kariet možno vložiť HTTPS adresu alebo nahrať súbor do Supabase Storage (bucket `site-images`, najviac 5 MB). Bucket musí existovať a mať bezpečne nastavené politiky pre zápis prihláseného správcu; bez toho nahrávanie neprejde. Fotografie jednotlivých odrôd a blogu sa zatiaľ nastavujú cez URL.
- Objednávkový formulár naďalej používa existujúce nastavenie FormSubmit. Databázové ukladanie objednávok zatiaľ nie je súčasťou tejto úpravy.
- Pri prvom spustení sa do cloudu prenesú údaje dostupné v prehliadači, z ktorého sa správca prvýkrát prihlási. Ak ste v minulosti upravovali obsah iba v inom prehliadači alebo zariadení, najprv z neho vyexportujte JSON a použite Import JSON po nastavení databázy.
