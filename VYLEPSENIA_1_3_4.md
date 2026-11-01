# Herba et Fructus — administračný prehľad, porovnanie odrôd a zrýchlenie

*Zmeny implementované 1. novembra 2026, vetva `main`.*

## 1. Prehľad správcu

Po prihlásení správcu sa v hornej lište zobrazuje **📊 Prehľad správcu**.
Je to samostatné okno s nasledujúcimi údajmi vypočítanými z aktuálne
načítaného `varietyDatabase` (vrátane dát zo Supabase):

- počet odrôd, viditeľných a skrytých položiek;
- odrody bez použiteľného HTTPS obrázka;
- odrody bez niektorého zo základných údajov (názov, sekcia, typ,
  farba, hmotnosť, opis, počet semien alebo platná kladná cena);
- vypredané viditeľné odrody a súčet skladových zásob;
- textové hľadanie a diagnostické filtre **Bez fotografie**,
  **Neúplné údaje**, **Vypredané** a **Skryté**;
- priame tlačidlo **Upraviť** pri každej nájdenej odrode.

Nástroj ponúka rýchly prístup na existujúce funkcie:
správa skladu, nová odroda, záloha JSON, kontrola cloudu,
správa kariet, nový blog a pozastavenie formulára.

**Dôležité:** diagnostika sama nič neopravuje ani neukladá,
iba zobrazuje aktuálne dostupné údaje. Číselné štatistiky
sa môžu líšiť od predvolených údajov v GitHube, pretože
skutočný obsah je na Supabase.

## 3. Pokročilé filtre a porovnanie

V katalógových sekciách pribudli rozšírené filtre:
- dostupnosť: všetky / na sklade / vypredané / s fotografiou;
- orientačná hmotnosť: do 30 g / 31–100 g / 101–250 g / nad 250 g;
- zoradenie: pôvodné / názov / cena vzostupne či zostupne /
  orientačná hmotnosť vzostupne či zostupne.

Hmotnosť sa pri intervale počíta približne zo **stredu uvedeného
rozsahu** a nie je to meranie plodu. Neznáme hmotnosti sa neodhadujú.
Doterajšie hľadanie, filtre typu a farby zostali zachované.
Farba `Žltá / Oranžová` teraz zodpovedá aj oranžovým opisom;
podobne sú rozšírené tmavé a pásikavé odrody.

Tlačidlo **⚖️ Porovnať odrodu** umožňuje vybrať 2 alebo 3 odrody,
ktoré sa zobrazia vedľa seba s fotografiami, opisom, typom, farbou,
hmotnosťou, cenou, počtom semien a dostupnosťou. Porovnávanie
používa aktuálne načítané údaje a **nemení košík ani sklad**.
Výber je dočasný a po obnovení stránky sa neuchováva.

Pri prechode do inej sekcie sa základné pomologické a farebné
filtre vrátia do východiskového stavu, aby nevznikala
prázdna sekcia kvôli filtru z iného druhu zeleniny.

## 4. Rýchlosť načítania

- Pri prvom vykreslení sa produktové karty vytvoria iba
  pre **práve aktívnu sekciu**. Karty ďalších sekcií sa
  vytvoria pri ich prvej návšteve.
- Fotografie produktov a blogu používajú `loading="lazy"`
  a `decoding="async"`; fotografiu úvodného príbehu
  prehliadač dostane ako prioritnejší prvok stránky.
- Pre karty mimo obrazovky sa používa
  `content-visibility: auto`, ak ju prehliadač podporuje.
- Vyhľadávanie pri každom stlačení klávesu mení len viditeľnosť
  kariet. Zbytočne nepresúva všetky elementy pri nezmenenom
  sortovaní.
- Kategórie typov sa bezpečne generujú z aktuálnych dát
  pomocou DOM, bez skladania spustiteľného HTML z názvu typu.
- `tests/performance-smoke.mjs` automaticky kontroluje základné
  veľkostné limity lokálnych súborov a prítomnosť úsporných
  spôsobov načítavania obrázkov.

**Pozor na rozsah merania:** testy overujú zdrojový kód
a veľkosti lokálnych súborov, nie skutočný čas načítania
na konkrétnej mobilnej sieti. Nahraté fotografie zo Supabase,
rýchlosť servera a externé knižnice treba prípadne preveriť
v Lighthouse alebo PageSpeed Insights.

## Čo sa nemenilo

Ceny, skladové počty, názvy, fotografie, katalógové opisy,
objednávkový formulár, nastavenie pozastavenia, email,
databázové pravidlá a spôsob prihlasovania do administrácie
ostávajú nedotknuté. Technické zmeny sú commitnuté iba
v súboroch webu na GitHube.

## Večerný kontrolný postup

1. Prihlás sa na PC ako správca a otvor **📊 Prehľad správcu**.
   Skontroluj, či prehľad odrôd a počty vyzerajú primerane.
2. V administratívnom prehľade vyber **Bez fotografie**
   a **Neúplné údaje**, prípadne otvor konkrétnu odrodu.
3. Na verejnej stránke **Paradajky** zapni filter **Na sklade**
   a zoraď odrody podľa ceny.
4. Klikni na **⚖️ Porovnať odrodu** pri dvoch alebo troch položkách,
   následne otvor porovnanie a skontroluj fotografie a ceny.
5. Prejdi do sekcie tekvíc a späť. Filtre by nemali zostať
   obmedzené nesúvisiacim pomologickým typom.
6. Na mobile si všimni rýchlosť otvorenia katalógu
   a posúvanie stránok. Ak sú rozdiely, pošli snímku
   obrazovky alebo URL a popis problému.

Pri nečakanom správaní je možné zmeny v zdrojovom kóde
vrátiť späť cez GitHub bez straty obsahu uloženého v Supabase.
