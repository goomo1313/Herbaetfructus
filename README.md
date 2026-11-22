# Herba et Fructus

[**Otvoriť Herba et Fructus**](https://herbaetfructus.sk/) · [**Katalóg odrôd**](https://herbaetfructus.sk/odrody/) · [**Pestovateľské články**](https://herbaetfructus.sk/clanky/) · [**3D záhradné štítky**](https://herbaetfructus.sk/3d/)

Slovenský pestovateľský web s katalógom odrôd paradajok a ďalších rastlín,
pestovateľskými článkami, nezáväzným dopytovým formulárom a
bezplatným generátorom STL záhradných zápichov.

## Technológie

- **GitHub Pages:** verejný statický web HTML/CSS/JavaScript.
- **Supabase:** aktuálny katalóg, fotografie, nastavenia viditeľnosti
  a autentifikácia správcu. Údaje sa nesmú prepisovať z lokálneho exportu.
- **FormSubmit:** externý prenos nezáväzných dopytov e-mailom, nie pokladňa
  ani systém potvrdených objednávok.
- **OpenSCAD WebAssembly a Three.js:** webový generátor 3D štítkov;
  1–60 názvov, STL a ZIP pri viacerých dávkach.
- **Prehliadač:** lokálne zapamätanie výberu odrôd bez osobných údajov;
  uloženie platí len na danom zariadení.

## Údržba

```sh
node scripts/generate-varieties.mjs --check
node scripts/generate-seo.mjs --check
node --test tests/*.mjs
```

Návrhy SQL politík sú v `supabase_setup.sql` a
`SUPABASE_FOTOGRAFIE.sql`. Nenasadzovať SQL bez kontroly
existujúcich pravidiel, nepoužívať verejne tajné kľúče ani heslá.
Údaje odrôd z databázy sa na SEO profily exportujú automaticky
iba pri explicitne verejnej odrode a sekcii.

**Dokumentácia:** [Návod na správu](README_SK.md) ·
[Stav a ďalší postup](STAV_WEBU_A_DALSIE_KROKY.md) ·
[SEO publikovanie](SEO_PUBLIKOVANIE.md) ·
[Bezpečnosť](SECURITY.md) ·
[Právne otázky pred poskytovaním osiva](PRAVNE_OVERENIE_PRE_SPRAVCU.md)

Tento repozitár nepredstavuje potvrdenie zákonnej možnosti uvádzať osivo na trh.
