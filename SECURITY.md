# Bezpečnostný prehľad

- Pôvodná kombinácia `admin / admin` bola odstránená.
- Prihlásenie používa Supabase Auth `signInWithPassword`.
- Po prihlásení sa kontroluje UUID používateľa cez `data.user.id`.
- Pri obnovení relácie sa používateľ znovu overuje volaním `auth.getUser()`.
- Admin-only funkcie kontrolujú stav prihlásenia cez `requireAdmin()`.
- V projekte nie je použitý Supabase `service_role` ani `secret` kľúč.

Poznámka: ide o statický web bez serverového backendu pre obsah. Administračné úpravy sa ukladajú lokálne v prehliadači a na zverejnenie je potrebný commit do GitHub repozitára. Klientská kontrola prihlásenia nie je náhradou serverovej autorizácie pre databázové operácie; pri budúcom pripojení databázy musia byť všetky zápisy vynútené serverovo/RLS politikami.
