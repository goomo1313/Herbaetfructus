-- Herba et Fructus: online databaza obsahu webovej stranky
-- Spustite cely skript v Supabase -> SQL Editor -> New query -> Run.
-- Tento skript vytvori tabulku a bezpecne pravidla pristupu. Obsah sa
-- pri prvom prihlaseni spravcu automaticky prenesie z aktualnych dat webu.

create table if not exists public.site_content (
    id text primary key check (id in ('sections', 'varieties', 'blog', 'settings')),
    content jsonb not null,
    updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

grant select on public.site_content to anon, authenticated;
grant insert, update, delete on public.site_content to authenticated;

drop policy if exists "Public can read site content" on public.site_content;
create policy "Public can read site content"
on public.site_content
for select
to anon, authenticated
using (true);

drop policy if exists "Only Herba admin can insert site content" on public.site_content;
create policy "Only Herba admin can insert site content"
on public.site_content
for insert
to authenticated
with check (auth.uid() = 'd8f6df7b-a06a-4327-9535-88df73c4eb4d'::uuid);

drop policy if exists "Only Herba admin can update site content" on public.site_content;
create policy "Only Herba admin can update site content"
on public.site_content
for update
to authenticated
using (auth.uid() = 'd8f6df7b-a06a-4327-9535-88df73c4eb4d'::uuid)
with check (auth.uid() = 'd8f6df7b-a06a-4327-9535-88df73c4eb4d'::uuid);

drop policy if exists "Only Herba admin can delete site content" on public.site_content;
create policy "Only Herba admin can delete site content"
on public.site_content
for delete
to authenticated
using (auth.uid() = 'd8f6df7b-a06a-4327-9535-88df73c4eb4d'::uuid);

-- Overenie: po prvom prihlaseni spravcu sa tu maju objavit 4 riadky:
-- sections, varieties, blog, settings
select id, updated_at from public.site_content order by id;
