-- DFNS global cosmetic reactions — run this once in Supabase SQL Editor.
-- The browser uses only the anon/public key. Never expose a service_role key.

create table if not exists public.cosmetic_votes (
  cosmetic_id text not null,
  voter_id text not null,
  vote text not null check (vote in ('fire', 'poop')),
  updated_at timestamptz not null default now(),
  primary key (cosmetic_id, voter_id)
);

create index if not exists cosmetic_votes_cosmetic_id_idx
  on public.cosmetic_votes (cosmetic_id);

alter table public.cosmetic_votes enable row level security;

create policy "Public can read cosmetic votes"
on public.cosmetic_votes
for select
to anon, authenticated
using (true);

create policy "Public can add cosmetic votes"
on public.cosmetic_votes
for insert
to anon, authenticated
with check (vote in ('fire', 'poop'));

create policy "Public can update cosmetic votes"
on public.cosmetic_votes
for update
to anon, authenticated
using (true)
with check (vote in ('fire', 'poop'));

create policy "Public can remove cosmetic votes"
on public.cosmetic_votes
for delete
to anon, authenticated
using (true);
