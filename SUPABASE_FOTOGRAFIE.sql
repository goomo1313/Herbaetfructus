-- Herba et Fructus: bezpečné úložisko fotografií
-- Spusť v Supabase -> SQL Editor s oprávnením správcu projektu.
-- Nezapisuj sem service_role kľúč. Prihlásený používateľ webu musí mať UUID podľa config.js.
--
-- 1. Vytvoríme verejný bucket pre obrázky katalógu a príbehu.
--    "Verejný" znamená len možnosť prezerať fotky. Nie je to povolenie nahrávať.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'site-images', 'site-images', true, 5242880,
    array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update set public = true;

-- 2. Právo uploadu majú iba platne prihlásení správcovia s týmto konkrétnym UUID.
drop policy if exists "Herba admin can upload site images" on storage.objects;
create policy "Herba admin can upload site images"
on storage.objects
for insert to authenticated
with check (
    bucket_id = 'site-images'
    and auth.uid() = 'd8f6df7b-a06a-4327-9535-88df73c4eb4d'::uuid
);

-- 3. Čistenie nepodarených uploadov môže vykonať len správca.
drop policy if exists "Herba admin can delete site images" on storage.objects;
create policy "Herba admin can delete site images"
on storage.objects
for delete to authenticated
using (
    bucket_id = 'site-images'
    and auth.uid() = 'd8f6df7b-a06a-4327-9535-88df73c4eb4d'::uuid
);

-- 4. Čítanie z verejných URL je dostupné návštevníkom,
--    ale pri práci cez Storage API správcovi pomôže aj SELECT politika.
drop policy if exists "Herba admin can list site images" on storage.objects;
create policy "Herba admin can list site images"
on storage.objects
for select to authenticated
using (
    bucket_id = 'site-images'
    and auth.uid() = 'd8f6df7b-a06a-4327-9535-88df73c4eb4d'::uuid
);

-- 5. Prehľad stavu bucketu. Ak už existoval s iným limitom alebo MIME zoznamom,
--    skontroluj jeho nastavenie ručne v Supabase -> Storage.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets where id='site-images';

-- Tieto pravidlá neupravujú iné buckety a nepridávajú anonymným používateľom
-- oprávnenie nahrávať, meniť alebo mazať fotografie.
