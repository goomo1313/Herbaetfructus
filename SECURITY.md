# Bezpečnosť webu Herba et Fructus

## Aktuálny spôsob fungovania

- Web je statický a publikovaný cez GitHub Pages. Články, katalóg a fotografie sa načítavajú cez verejnú časť stránky a Supabase.
- Prihlasovanie do administrácie používa **Supabase Auth** s heslom; predvolené `admin/admin` už neexistuje.
- Po prihlásení a obnovení relácie sa kontroluje UUID správcu. **Overenie v prehliadači však nie je bezpečnostná hranica.** Skutočnú autorizáciu zápisov musia vynucovať politiky **Row Level Security (RLS)** v Supabase.
- SQL návrh politík pre `public.site_content` je v `supabase_setup.sql`. SQL pre úložisko fotografií `site-images` je v `SUPABASE_FOTOGRAFIE.sql`. Skutočne nasadené politiky treba overiť v Supabase Dashboard – repozitár to sám nepotvrdzuje.
- Verejný `publishable/anon` kľúč je určený na použitie v prehliadači; **`service_role`, `secret` kľúč ani heslo správcu nesmú byť v repozitári.**
- Obsah, fotografie a stav pozastavenia formulára sa v oprávnenom režime ukladajú cez Supabase. GitHub commit nie je potrebný pri bežných administratívnych úpravách obsahu.
- Údaje článkov vo formáte HTML sa pri zobrazení filtrujú: povolené sú nadpisy, odseky, textové formátovanie, obrázky s HTTPS adresou a vybrané prvky rozloženia; nebezpečné a spustiteľné značky sú zakázané.
- Odstraňovanie odrôd, článkov a sekcií a presúvanie poradia sa v rozhraní potvrdzuje **až po úspešnom uložení** do Supabase.
- Tlačidlo **Overiť cloud** iba porovná existujúce údaje so serverom a nespúšťa žiadny hromadný prepis. Ak pracuješ súčasne na mobile a počítači, po upozornení na rozdiely najprv vytvor JSON zálohu, až potom obnov stránku.

## Otvorené otázky a obmedzenia

- GitHub Pages neposkytuje vlastný serverový backend na overovanie objednávok. Nezáväzný formulár odosiela údaje cez službu FormSubmit. Pozastavenie formulára v rozhraní **neblokuje priamu komunikáciu s externým endpointom**.
- Pred pravidelným predajom treba doplniť zákonné informácie a vyriešiť požiadavky na uvádzanie osiva na trh. Viac v `PRAVNE_OVERENIE_PRE_SPRAVCU.md`.
- Automatické testy overujú kód a pravidlá. **Nenahrádzajú manuálne penetračné testy, kontrolu politiky RLS, úplný test v mobilnom prehliadači ani skúšobný nákup.**
- Ak sa používa vlastná doména, uprav `canonical`, `og:url`, `og:image`, `sitemap.xml` a prípadne nastavenia FormsSubmit.

## Postup pri podozrení na neoprávnené zmeny

1. V Supabase skontroluj používateľov Auth, RLS politiky a prístupové logy.
2. Zmeň heslo správcu a skontroluj ďalšie aktívne relácie.
3. Porovnaj aktuálne údaje s vlastnou JSON zálohou a over prípadné zmeny v GitHube.
4. Nikdy neposielaj do verejného chatu alebo repozitára heslá, `service_role` ani iné tajné kľúče.
