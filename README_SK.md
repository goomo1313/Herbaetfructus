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

## Poznámky

- Obrázky sa zatiaľ ukladajú ako existujúce URL adresy v údajoch odrôd a článkov. Samostatné nahrávanie fotografií do Supabase Storage môžeme doplniť ako ďalšiu etapu.
- Objednávkový formulár naďalej používa existujúce nastavenie FormSubmit. Databázové ukladanie objednávok zatiaľ nie je súčasťou tejto úpravy.
- Pri prvom spustení sa do cloudu prenesú údaje dostupné v prehliadači, z ktorého sa správca prvýkrát prihlási. Ak ste v minulosti upravovali obsah iba v inom prehliadači alebo zariadení, najprv z neho vyexportujte JSON a použite Import JSON po nastavení databázy.
