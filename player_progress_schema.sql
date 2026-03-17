create table if not exists public.player_progress (
  owner_id uuid primary key,
  player_code text not null,
  player_email text not null,
  learner_name text not null,
  level_records jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_player_progress_player_code on public.player_progress(player_code);
create unique index if not exists idx_player_progress_player_email on public.player_progress(player_email);

create or replace function public.set_player_progress_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_player_progress_updated_at on public.player_progress;
create trigger trg_player_progress_updated_at
before update on public.player_progress
for each row
execute function public.set_player_progress_updated_at();

alter table public.player_progress enable row level security;

drop policy if exists player_progress_select_own on public.player_progress;
create policy player_progress_select_own on public.player_progress
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists player_progress_insert_own on public.player_progress;
create policy player_progress_insert_own on public.player_progress
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists player_progress_update_own on public.player_progress;
create policy player_progress_update_own on public.player_progress
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
