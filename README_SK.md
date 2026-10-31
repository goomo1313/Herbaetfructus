# Herba et Fructus – web pre GitHub Pages

Tento balík obsahuje upravenú stránku Herba et Fructus pripravenú na publikovanie cez GitHub Pages.

## Čo zostalo zachované

- úvodná stránka a navigácia podľa sekcií,
- katalóg odrôd paradajok a tekvíc,
- vyhľadávanie a filtre podľa typu a farby,
- karty odrôd, obrázky a zväčšenie fotografií,
- výber odrôd a množstva v objednávkovom formulári,
- formulár kúpy, výmeny a pestovateľských otázok cez FormSubmit,
- blog s obrázkami, videami a formátovaním,
- administrácia sekcií, odrôd, skladu a blogu,
- import/export JSON, reset lokálnych dát a stiahnutie upraveného HTML.

## Bezpečnejšie prihlasovanie správcu

Pôvodné verejné prihlasovanie `admin / admin` bolo odstránené. Nové prihlasovanie overuje e-mail a heslo cez **Supabase Auth**. V zdrojovom kóde nie je uložené heslo.

### 1. Vytvorenie Supabase projektu

1. Vytvorte bezplatný projekt na [supabase.com](https://supabase.com/).
2. V projekte otvorte **Authentication → Users** a vytvorte používateľa správcu s vaším e-mailom a silným, jedinečným heslom.
3. Pri vytvorení používateľa si skopírujte jeho **User UID** (UUID).
4. V **Authentication → Providers → Email** ponechajte prihlásenie e-mailom a heslom povolené.
5. V nastaveniach prihlasovania vypnite verejnú registráciu nových používateľov (**Allow new users to sign up**). Správcu pridávajte iba cez administráciu Supabase.

### 2. Vyplnenie konfigurácie

Otvorte súbor `config.js` a doplňte tri hodnoty:

- `supabaseUrl` – Project URL zo Supabase → Project Settings → API.
- `supabaseAnonKey` – verejný **publishable key** alebo starší **anon key** z tej istej sekcie.
- `adminUserId` – UUID používateľa správcu z Authentication → Users.

Do `config.js` nikdy nevkladajte heslo ani `service_role` / `secret` kľúč. Publishable/anon kľúč je určený na použitie vo verejnom klientovi; nesmie však mať priveľké oprávnenia k databáze. Táto stránka na prihlasovanie databázu nepoužíva.

### 3. Nahratie na GitHub Pages

1. Rozbaľte tento ZIP.
2. Vytvorte nový GitHub repository (alebo použite existujúci).
3. Nahrajte do koreňa repozitára súbory `index.html`, `config.js` a prípadne `.nojekyll`.
4. Otvorte **Settings → Pages**.
5. Ako zdroj vyberte **Deploy from a branch**, branch `main` a priečinok `/ (root)`, potom uložte.
6. Po publikovaní otvorte adresu GitHub Pages a otestujte verejnú stránku aj prihlásenie správcu.

Supabase URL musí používať HTTPS. Pri testovaní cez lokálny server môžete do Supabase Auth → URL Configuration doplniť aj lokálnu adresu; samotné prihlásenie e-mailom a heslom nevyžaduje OAuth presmerovanie.

## Dôležité: ako fungujú úpravy a sklad

Stránka je statická (GitHub Pages). Rovnako ako pôvodná verzia, aj táto ukladá zmeny administrácie do `localStorage` konkrétneho prehliadača. Zmeny sa automaticky nepublikujú na GitHub a nevidia ich ostatní návštevníci.

Pred prvým spustením nastavte aj cieľový e-mail objednávkového formulára: v administračnej lište otvorte **E-mail**, zadajte svoju adresu a následne použite **Stiahnuť HTML**. Predvolená adresa `tvojemail@priklad.sk` je iba zástupný text.

Postup zverejnenia úprav:

1. Prihláste sa ako správca.
2. Upravte katalóg, sklad, sekcie alebo blog.
3. Použite **Stiahnuť HTML** a stiahnutý súbor pomenujte `index.html`.
4. Nahraďte ním `index.html` v GitHub repozitári a commitnite zmenu.

Na uchovanie údajov použite aj tlačidlo **Export JSON**. Sklad v tejto verzii je lokálny: odpočítanie zásob z formulára sa prejaví iba v prehliadači, z ktorého bol formulár odoslaný. Nie je to spoločný sklad v reálnom čase. Na spoločný sklad a automatické zverejňovanie by bolo potrebné pripojiť databázu a serverové pravidlá prístupu.

## Bezpečnostné upozornenia

- Každý, kto má prístup do GitHub repozitára s právom zápisu, môže zmeniť verejnú stránku. Chráňte GitHub účet dvojfaktorovým overením.
- Prihlasovacie heslo správcu sa neposiela do GitHubu ani sa neukladá v súbore stránky.
- UUID správcu a publishable/anon kľúč sú verejné identifikátory, nie prihlasovacie tajomstvá.
- Prihlasovacia obrazovka chráni vstup do administračného rozhrania, ale samotný GitHub Pages web je statický. Skutočnú ochranu publikovania zabezpečuje prístup do GitHub repozitára.

## Súbory

- `index.html` – stránka a všetky pôvodné funkcie.
- `config.js` – verejná konfigurácia Supabase (treba doplniť).
- `.nojekyll` – pomocný súbor pre GitHub Pages.
