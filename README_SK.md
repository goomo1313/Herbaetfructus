## Fotografia nášho príbehu – 1. november 2026

Fotografia rozmanitých vlastnoručne pestovaných paradajok od majiteľa je uložená
priamo v GitHube ako `assets/nas-pribeh-paradajky.jpg`. Ide o webovo optimalizovaný
JPEG (760 × 982 px). Na domovskej karte **Náš príbeh** je štandardne zobrazená
celá bez orezania. Existujúci text a všetky ostatné sekcie zostali zachované.

- **Staršia databáza:** ak v zázname `sections` chýbala fotografia príbehu,
  po načítaní stránky sa automaticky doplní lokálny obrázok. Už nastavená
  fotografia sa neprepisuje.
- **Trvalé uloženie:** pri najbližšom prihlásení správcu sa aktualizuje
  záznam `sections` v Supabase, a potom sa do `settings` uloží jednorazový
  marker `homeStoryPhotoReleaseId`. Následne je možné fotografiu aj odstrániť
  bez toho, aby sa sama znovu objavila.
- **Bezpečné zobrazenie:** lokálny obrázok v danom adresári je výnimkou
  z pravidla HTTPS adries; všetky ďalšie ručne vložené odkazy na obrázky
  musia byť HTTPS.
- **Zlyhané nahrávanie:** fotografie v administrácii potrebujú existujúci
  bucket Supabase Storage `site-images` a správne pravidlá pre prihláseného
  správcu. To je nezávislé od obrázkov uložených priamo v GitHube.
  Pripravili sme skript `SUPABASE_FOTOGRAFIE.sql`, ktorý treba spustiť
  v **Supabase → SQL Editor → Run** so správcom projektu. Skript nevykonávaj
  opakovane po vlastných úpravách politík bez kontroly.
- **Nový upload v správe kariet:** JPG, PNG a WebP sa pri potrebe najprv
  zmenšujú, veľké súbory do 20 MB možno vybrať, a následne sa ukladajú
  ako obrázky do Storage. Pri chýbajúcom buckete alebo zamietnutom
  prístupe administrácia zobrazí vysvetlenie problému.

Automatický test `tests/story-photo.mjs` kontroluje, či je reálny JPEG
v repozitári, či nová stránka používa daný záber a či sa vlastné fotografie
pri migrácii neprepisujú.

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

## Pozastavenie a obnovenie nezáväzného formulára

Po prihlásení správcu sa v hornej administračnej lište zobrazuje tlačidlo
**⏸ Pozastaviť formulár**. Po stlačení sa stav uloží do existujúceho záznamu
`site_content.settings` v Supabase ako `orderFormPaused: true`.
Tlačidlo sa zmení na **▶ Obnoviť formulár**; jeho opätovným stlačením sa
uloží `orderFormPaused: false`.

Keď je formulár pozastavený, návštevníkom sa nezobrazuje celá sekcia
nezáväzného dopytu ani plávajúci košík. Na kartách odrôd sa namiesto tlačidiel
na pridanie balení zobrazí informácia o dočasnom pozastavení. V detailoch
odrôd sa deaktivujú tlačidlá pre výber a prechod k dopytu, ale samotný
katalóg, fotografie, články a kalendár ostávajú dostupné. Bežné odoslanie
formulára web navyše kontroluje a odmieta pri pozastavenom stave.

Prepínač funguje iba v prihlásenom režime správcu a stav sa zmení až
po potvrdenom zápise do Supabase. Ak databáza nie je dostupná alebo uloženie
zlyhá, zostane pôvodný stav zachovaný. Pri ďalšom načítaní webu sa obnoví
uložené nastavenie. **Pozastavenie je ovládanie webového rozhrania**;
nie je to blokovanie priameho externého endpointu FormSubmit na jeho serveri.
Ak chceš úplne zastaviť príjem správ aj mimo webu, treba ho obmedziť
priamo u poskytovateľa formulára.

Automatické kontroly v `tests/form-pause.mjs` overujú ukladanie stavu,
zobrazenie, odmietnutie odoslania a návrat pri chybe cloudu.

## Bezpečná údržba a úpravy z 1. 11. 2026

Tieto vylepšenia boli vykonané v GitHube bez zápisu do živých dát Supabase.
Všetky existujúce názvy, fotografie, ceny, sklad, stav formulára a vlastné
články správcu ostávajú zachované.

### Bezpečnejšie úpravy v administrácii
- Zmazanie odrody, článku či karty, zmena poradia a skrytie karty sa
  lokálne prejavia až po potvrdenom uložení na Supabase. Pri chybe
  sieťového spojenia sa zmeny nepredstierajú ako uložené.
- Kartu s existujúcimi odrodami nemožno zmazať, kým sa odrody
  nepremiestnia. Základné systémové karty majú ochranu proti zmazaniu.
- Vykresľovanie hodnôt v administračnej tabuľke používa HTML escapovanie.
- HTML článkov je pri zobrazení filtrované. Ponechávajú sa bežné
  bloky, odseky, nadpisy, zoznamy, externé HTTPS odkazy, obrázky
  a bezpečné zarovnanie; nebezpečné značky a udalostné atribúty sa
  nedostanú do aktívneho HTML.

### Používanie na mobile a klávesnici
- Pomocný súbor `site-polish.css` zlepšuje medzery, ovládacie
  plochy tlačidiel, vodorovne posúvateľné menu a modálne okná.
- Výška hornej administračnej lišty sa meria podľa skutočného
  zalomenia na mobile. Lišta sa tak nemá prekrývať s navigáciou.
- Pribudol odkaz **Preskočiť na hlavný obsah**, kontrastné zvýraznenie
  klávesnicového fokusu a šetrné nastavenie pre preferované
  obmedzenie animácií.

### Overiť cloud (bez prepisovania)
Pôvodné ručné tlačidlo **Uložiť do cloudu** by mohlo na jednom zariadení
prepísať novšie zmeny, ktoré medzitým prišli z druhého zariadenia.
Nahradilo ho **☁️ Overiť cloud**. Teraz:
1. počká na dokončenie automaticky bežiacich zápisov;
2. prečíta štyri záznamy `sections`, `varieties`, `blog`, `settings`;
3. porovná obsah a upozorní na chýbajúce alebo odlišné údaje;
4. **neodosiela žiadny zápis ani nič nemaže**.

Ak sa údaje líšia, najprv stiahni **Zálohovať JSON** a až potom obnov stránku.
Nemení sa spôsob automatického uloženia po bežnej úprave v admin režime.

### Vyhľadávače a zdieľanie
Pridané sú `sitemap.xml`, `robots.txt`, kanonická URL pre súčasné
GitHub Pages, Open Graph obrázok z Nášho príbehu a meta údaje na zdieľanie.
Mapa webu aktuálne obsahuje iba skutočnú hlavnú URL, pretože
dynamické detailné okná `#odroda=...` nie sú samostatné HTML dokumenty.
**`robots.txt` v podpriečinku GitHub Pages nie je pravidlom na úrovni
koreňa domény**. Pre budúcu vlastnú doménu treba súbory a URL znova
aktualizovať. Samostatné indexovateľné stránky jednotlivých odrôd
zatiaľ nie sú vytvorené, aby sa nesprávne neduplikovali alebo neoddelili
od živých dát Supabase.

### Automatické testy
Pridané sú `tests/maintenance-safety.mjs` a `tests/polish-smoke.mjs`.
Overujú návrat pri neúspešnom cloude, mazanie a poradie sekcií,
základnú sanitizáciu článkov, čítanie cloudu bez zápisu, rozlíšenie
nezhodných dát na inom zariadení, pohyblivú výšku administračnej lišty
a základné súbory pre SEO.


## Presun sprievodcu „Odroda má svoj charakter“ do blogu

Pôvodný dvojstĺpcový informačný blok v katalógu **Paradajky** bol nahradený
jednoriadkovým odkazom na praktický článok v časti **Blog & rady**:
**Odroda má svoj charakter: ako si vybrať paradajky do svojej záhrady**.
Článok obsahuje výber podľa využitia plodov, miesta, rastu, prípravy semien
aj realistické očakávania pri odlišných podmienkach pestovania. Používa
autentickú fotografiu uloženú v `assets/nas-pribeh-paradajky.jpg`.
Starší odborný článok o typoch paradajok zostal zachovaný, pretože vysvetľuje
iné, podrobnejšie rozdelenie.

Redakčná migrácia `editorial-2026-11-01-v2` doplní jeden nový článok
do existujúcej cloudovej databázy bez opätovného vytvárania zmazaných článkov
z predchádzajúceho vydania `v1`. Nový článok je návštevníkom viditeľný
po načítaní webu; **trvalé uloženie do Supabase** prebehne pri ďalšom
úspešnom prihlásení oprávneného správcu. Po tomto uložení ho možno v
administrácii upraviť či zmazať bez automatického obnovenia.

## Presun sprievodcu tekvicami do blogu

Dlhý úvod pri katalógu **Tekvice a cukety** je nahradený stručným odkazom.
Obsah je rozpracovaný do článku **Od letnej cukety po zimnú tekvicu:
pestovanie, zber a skladovanie** v rubrike *Tekvice a cukety*. Rozoberá
výber druhu, pestovateľské podmienky, zber mladých cukiet, vyzretie zimných
tekvíc, skladovanie a zásady získavania vlastných semien. Nenahrádza
existujúci samostatný článok o krížení tekvicovitých.

Redakčné vydanie `editorial-2026-11-01-v3` je kompatibilné s databázami,
ktoré majú uložené vydanie `v1` alebo `v2`. Ak má správca uložené `v2`,
doplní iba tento nový článok; ak `v1`, doplní oba nové sprievodcovské
články. Žiadne staršie články ručne zmazané po prvom vydaní sa pri
prechode nepridajú späť. Trvalé uloženie do Supabase nastane po ďalšom
úspešnom prihlásení správcu, dovtedy je nový článok dostupný verejne
ako súčasť redakčného súboru.


## Samostatné vlastnosti odrôd a bezpečné hromadné úpravy

Pri každej odrode je v editore nová časť **Samostatné vlastnosti odrody**:
rastový typ, skorosť/dozrievanie, chuť, využitie plodov, pestovanie/stanovište
a overený pôvod osiva. Údaje sa ukladajú do voliteľného objektu `properties`.
Staršie záznamy sú naďalej platné, aj keď `properties` neobsahujú.
Hodnoty sa **automaticky neodhadujú** z poľa Typ/Pomológia, názvu alebo popisu;
chýbajúce charakteristiky sa na stránke nezobrazujú. Zadané charakteristiky
sa zobrazujú v kartách, podrobných detailoch odrôd a môžu sa vyhľadávať.

V administračnej lište a v okne Tabuľka odrôd je nové tlačidlo
**✏️ Hromadné vlastnosti**:

1. Vyhľadaj odrody a označ iba tie, ktoré chceš upraviť (alebo
   označ všetky aktuálne vyfiltrované).
2. Vyber **jedno** z povolených šiestich polí a zadaj overenú hodnotu.
3. Skontroluj náhľad, počet položiek a potvrď zápis.

Hromadný editor neumožňuje úpravu skladových zásob, cien, názvov,
fotografií, galérií, dostupnosti ani pôvodných popisov. Používa kopírovanie
objektov, a preto existujúce polia zostávajú nezmenené. Pred zápisom počká
na predchádzajúce cloudové ukladania, porovná celý záznam `varieties` v
Supabase s lokálnym stavom a používa podmienku na `updated_at`. Ak obsah
alebo časová značka medzitým nesúhlasí, **odmietne zápis** a upozorní na
potrebu obnoviť údaje. V lokálnej pamäti sa zmena potvrdí až po úspešnom
zápise do cloudu. Pri chybe sú údaje zachované. RLS pravidlá v Supabase
musí mať správca naďalej správne nastavené.

**Poznámka:** Súčasná databáza ukladá katalóg v jednom JSONB zázname.
Podmienený zápis chráni tento hromadný editor pred väčšinou súbežných
zmien. Staršie samostatné úpravy cez iné editory používajú pôvodný spôsob
zápisu; pri úpravách z viacerých zariadení súčasne je stále rozumné
využívať nástroj **Overiť cloud** a export JSON.

Automatické testy `tests/variety-properties.mjs` preverujú zachovanie
pôvodných polí, ochranu HTML, validáciu, úspešný hromadný zápis, odmietnutie
zastaranej kópie a bezpečné správanie pri zamietnutí zápisu. Neoverujú
skutočné prihlasovacie oprávnenia ani RLS na živom účte.


## Kompletné hromadné operácie s odrodami

Po prihlásení klikni na **🛠️ Hromadné operácie** v hornej administračnej
lište alebo v **📊 Prehľade správcu**. Vyhľadaj a označ konkrétne odrody
(tlačidlo *Označiť vyfiltrované* vyberie iba aktuálne vyfiltrované položky).
Potom zvoľ **jednu operáciu**, skontroluj náhľad pôvodná → nová hodnota
a potvrď uloženie. Pri opakovaných zmenách vyber ďalšie pole znova.

Dostupné skupiny polí:

- **Základné údaje:** názov (šablóna s `{name}`, aby každý názov zostal
  unikátny), sekcia, typ/pomológia, farba, hmotnosť, popis, multiflora,
  viditeľnosť a označenie vlajkovej odrody.
- **Ceny a zásoby:** nastavenie jednotnej ceny v EUR, percentuálne zvýšenie
  či zníženie pôvodných cien, nastavenie počtu balení na sklade, pripočítanie
  alebo odpočítanie určitého počtu balení, počet semien v balíčku.
- **Fotografie:** nastaviť alebo vymazať hlavný HTTPS obrázok; jeho zobrazenie
  `contain`/`cover`; pridať, nahradiť, odobrať konkrétne URL, vymazať
  galériu; nastaviť zobrazenie všetkých fotiek v galérii;
  nahrať spoločnú hlavnú fotografiu alebo spoločné fotografie do galérie.
- **Pestovateľské vlastnosti:** rastový typ, skorosť, chuť, využitie,
  stanovište a pôvod osiva. Pri voliteľných textových poliach je možné
  explicitne vymazať hodnotu.

**Príklady:**
- Vyber desať odrôd → *Cena za balenie (€) – nastaviť* → `1,50`.
- Vyber päť odrôd → *Cena – zmeniť o %* → `-10` (každá cena sa zníži
  o 10 % zo svojej pôvodnej hodnoty).
- Vyber tri odrody → *Sklad – pridať / odobrať* → `+5`.
- Vyber pomenované odrody → *Názov (šablóna)* → `{name} – 2026`.
- Vyber odrody, ktoré zdieľajú fotografiu → nahraj JPEG, PNG alebo WebP.
  **Rovnaké nahraté fotografie sa priradia všetkým označeným odrodám.**
  Tento režim nepoužívaj na rôzne odrody, ktoré nemajú spoločný záber.

**Bezpečnosť a hranice:**
- Systém neposiela zmeny pri výbere alebo písaní do poľa.
  Zápis vyžaduje označené odrody, platné hodnoty a potvrdenie.
- Mení sa iba zvolené pole. Všetky ostatné hodnoty vrátane cien, zásob
  a URL fotografií zostávajú nedotknuté, pokiaľ si práve ich nezvolíš.
- Ceny sú v rozsahu viac než 0 až 1000 €; sklad 0 až 100 000 celých balení.
  Pri neplatnom výsledku sa zamietne **celá** operácia.
- Maximálne osem fotografií vrátane hlavnej na odrodu; najviac šesť súborov
  pri jednom nahratí. URL musia používať HTTPS.
- Vymazanie odkazu na fotografiu neodstraňuje fyzický súbor v Supabase Storage.
  Nahrávanie spoločných fotografií vytvorí jeden súbor a jeho URL sa použije
  pre všetky označené odrody.
- Pred uložením sa porovnajú aktuálne údaje s tým, čo bolo načítané pri
  otvorení editora. Zápis do Supabase používa podmienenú aktualizáciu
  `updated_at`; súbežné zmeny sú odmietnuté. Počas nahrávania sa
  čerstvosť dát overí druhýkrát a nepoužité súbory sa pri chybe
  pokúsi odstrániť.
- Hromadné operácie nemažú celé odrody ani automaticky neprepisujú
  celú databázu odrôd zo vzorových hodnôt. Nové správcovské funkcie
  nevyžadujú SQL migráciu.
- Automatické testy kontrolujú validačné pravidlá a simulované
  cloudové zlyhania; skutočné pravidlá Supabase RLS a práva Storage
  je potrebné overiť v účte.

## Poznámky

- **Fotografie:** správca môže vkladať URL alebo nahrávať súbory priamo pri kartách aj odrodách. Galérie odrôd majú vlastný editor a zmenšovanie obrázkov. Fotografie blogu sa zatiaľ nastavujú cez HTTPS URL. Bucket `site-images` musí mať bezpečné RLS politiky.
- Objednávkový formulár naďalej používa existujúce nastavenie FormSubmit. Databázové ukladanie objednávok zatiaľ nie je súčasťou tejto úpravy.
- Pri prvom spustení sa do cloudu prenesú údaje dostupné v prehliadači, z ktorého sa správca prvýkrát prihlási. Ak ste v minulosti upravovali obsah iba v inom prehliadači alebo zariadení, najprv z neho vyexportujte JSON a použite Import JSON po nastavení databázy.

## Spoločné nastavenia zobrazovania cien a formulára (november 2026)

Po prihlásení správcu otvor tlačidlo **⚙️ Ceny a formulár** v hornej lište
(alebo v **📊 Prehľade správcu**). V jednom okne sú dve nezávislé voľby:

- **🙈 Skryť ceny / 👁️ Zobraziť ceny** — prepína `farmSettings.pricesHidden`
  uložený v existujúcom zázname `settings` v Supabase. Vypnuté ceny sa
  nezobrazujú na kartách odrôd, v detailoch, v porovnaní, pri výbere
  odrôd, v plávajúcom súčte ani v súhrne nezáväzného dopytu. V katalógu
  vtedy nezobrazujeme ani možnosti zoradenia podľa ceny. **Údaje o cenách
  odrôd sa neprepíšu ani nevymažú**; v správe skladu a v editore zostávajú
  dostupné. Východiskový stav pre staršie nastavenia je „ceny zobrazené“.
- **⏸ Pozastaviť formulár / ▶ Obnoviť formulár** — pôvodný prepínač
  `farmSettings.orderFormPaused` je presunutý do rovnakého okna, jeho
  funkcia zostala zachovaná. Vypnutie formulára nesúvisí s vypnutím cien.

Každá voľba sa uloží do Supabase **ešte pred aktualizáciou verejného
zobrazenia**. Ak ukladanie zlyhá alebo správca nie je prihlásený,
predchádzajúci stav zostáva zachovaný. Pri prebiehajúcom ukladaní
nie je možné spustiť druhé prepnutie a omylom prepísať prvé.
Nastavenia sa načítajú pri ďalšom otvorení stránky.

**Bezpečnostná hranica:** skrytie cien je iba zmena verejného rozhrania.
Ceny zostávajú uložené v katalógových záznamoch, ktoré statická stránka
načítava do prehliadača; preto **nejde o utajenie cien pred technicky
zdatným návštevníkom**. Na skutočné obmedzenie prístupu k cenám
by bol potrebný oddelený chránený zdroj údajov na serveri.

Kontrolné testy sú v `tests/price-visibility.mjs`.

