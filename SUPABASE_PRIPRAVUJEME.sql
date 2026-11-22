-- Herba et Fructus – súkromné rozpracované odrody (Pripravujeme)
-- Spusti RAZ v Supabase Dashboard -> SQL Editor -> Run.
-- Neprepisuje public.site_content, existujúce fotografie, sklad ani ceny.
-- Bez tohto SQL admin karta z bezpečnostných dôvodov neumožní ukladať koncepty.

create table if not exists public.site_drafts (
    id text primary key check (char_length(id) between 8 and 100),
    content jsonb not null,
    updated_at timestamptz not null default now()
);

alter table public.site_drafts enable row level security;

-- Anonymný kľúč webu nemá prístup k týmto záznamom.
revoke all on table public.site_drafts from anon;
grant select, insert, update, delete on public.site_drafts to authenticated;

drop policy if exists "Herba admin reads private drafts" on public.site_drafts;
create policy "Herba admin reads private drafts"
on public.site_drafts
for select to authenticated
using (auth.uid() = 'd8f6df7b-a06a-4327-9535-88df73c4eb4d'::uuid);

drop policy if exists "Herba admin creates private drafts" on public.site_drafts;
create policy "Herba admin creates private drafts"
on public.site_drafts
for insert to authenticated
with check (auth.uid() = 'd8f6df7b-a06a-4327-9535-88df73c4eb4d'::uuid);

drop policy if exists "Herba admin updates private drafts" on public.site_drafts;
create policy "Herba admin updates private drafts"
on public.site_drafts
for update to authenticated
using (auth.uid() = 'd8f6df7b-a06a-4327-9535-88df73c4eb4d'::uuid)
with check (auth.uid() = 'd8f6df7b-a06a-4327-9535-88df73c4eb4d'::uuid);

drop policy if exists "Herba admin deletes private drafts" on public.site_drafts;
create policy "Herba admin deletes private drafts"
on public.site_drafts
for delete to authenticated
using (auth.uid() = 'd8f6df7b-a06a-4327-9535-88df73c4eb4d'::uuid);

-- Kontrolné dotazy, nespôsobujú zmenu údajov.
select relrowsecurity as rls_enabled
from pg_class
where oid = 'public.site_drafts'::regclass;

select tablename, policyname, roles, cmd
from pg_policies where schemaname='public' and tablename='site_drafts'
order by policyname;
