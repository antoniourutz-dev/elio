-- =============================================================
-- DAILY GAME SCHEMA
-- Ejecutar en Supabase → SQL Editor
-- =============================================================

-- ── 1. game_words: activar RLS + política de lectura ─────────
-- La tabla ya existe (la creaste manualmente).
-- Solo hay que asegurarse de que RLS está activo y que los
-- jugadores autenticados pueden leer las palabras.

alter table public.game_words enable row level security;

drop policy if exists game_words_select_authenticated on public.game_words;
create policy game_words_select_authenticated
  on public.game_words
  for select
  to authenticated
  using (true);

-- Solo el irakasle puede insertar / actualizar / borrar palabras
drop policy if exists game_words_teacher_all on public.game_words;
create policy game_words_teacher_all
  on public.game_words
  for all
  to authenticated
  using (public.is_irakasle())
  with check (public.is_irakasle());

-- ── 2. daily_scores: tabla de puntuaciones diarias ───────────
-- Una fila por jugador por día (UNIQUE owner_id + day_key).
-- El ranking es público: cualquier jugador autenticado puede
-- ver todos los scores del día para mostrar el top 5.

create table if not exists public.daily_scores (
  id          bigserial primary key,
  owner_id    uuid        not null references auth.users(id) on delete cascade,
  player_code text        not null,
  day_key     text        not null,                          -- formato YYYY-MM-DD
  score       integer     not null default 0 check (score >= 0),
  correct_count   integer not null default 0 check (correct_count >= 0),
  total_questions integer not null default 0 check (total_questions >= 0),
  seconds_elapsed integer not null default 0 check (seconds_elapsed >= 0),
  completed_at timestamptz not null default now(),
  constraint daily_scores_unique_player_day unique (owner_id, day_key)
);

-- Índices para las consultas más frecuentes
create index if not exists idx_daily_scores_day_key
  on public.daily_scores (day_key, score desc, seconds_elapsed asc);

create index if not exists idx_daily_scores_owner_day
  on public.daily_scores (owner_id, day_key);

-- Trigger updated_at (opcional pero útil para auditoría)
alter table public.daily_scores
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_daily_scores_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_daily_scores_updated_at on public.daily_scores;
create trigger trg_daily_scores_updated_at
  before update on public.daily_scores
  for each row
  execute function public.set_daily_scores_updated_at();

-- ── RLS daily_scores ─────────────────────────────────────────
alter table public.daily_scores enable row level security;

-- Cada jugador puede insertar su propio score
drop policy if exists daily_scores_insert_own on public.daily_scores;
create policy daily_scores_insert_own
  on public.daily_scores
  for insert
  to authenticated
  with check (owner_id = auth.uid());

-- Cada jugador puede actualizar su propio score (upsert)
drop policy if exists daily_scores_update_own on public.daily_scores;
create policy daily_scores_update_own
  on public.daily_scores
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Todos los jugadores autenticados pueden ver el ranking del día
drop policy if exists daily_scores_select_all on public.daily_scores;
create policy daily_scores_select_all
  on public.daily_scores
  for select
  to authenticated
  using (true);

-- El irakasle puede borrar scores (por si hay trampas / reinicios)
drop policy if exists daily_scores_teacher_delete on public.daily_scores;
create policy daily_scores_teacher_delete
  on public.daily_scores
  for delete
  to authenticated
  using (public.is_irakasle());

-- ── 3. RPC: ranking diario con posición propia ───────────────
-- Devuelve top N scores del día + la fila del jugador actual
-- si está fuera del top N, para evitar hacer dos queries.
create or replace function public.get_daily_ranking(
  target_day_key text,
  top_n          integer default 5
)
returns table (
  player_code     text,
  score           integer,
  correct_count   integer,
  total_questions integer,
  seconds_elapsed integer,
  rank            bigint,
  is_current_user boolean
)
language sql
stable
security invoker
as $$
  with ranked as (
    select
      ds.player_code,
      ds.score,
      ds.correct_count,
      ds.total_questions,
      ds.seconds_elapsed,
      ds.owner_id,
      row_number() over (order by ds.score desc, ds.seconds_elapsed asc) as rank
    from public.daily_scores ds
    where ds.day_key = target_day_key
  )
  select
    r.player_code,
    r.score,
    r.correct_count,
    r.total_questions,
    r.seconds_elapsed,
    r.rank,
    (r.owner_id = auth.uid()) as is_current_user
  from ranked r
  where r.rank <= top_n
     or r.owner_id = auth.uid()
  order by r.rank asc;
$$;

grant execute on function public.get_daily_ranking(text, integer) to authenticated;

comment on function public.get_daily_ranking is
  'Devuelve el top-N del día + la fila del usuario actual si está fuera del top-N.';

comment on table public.daily_scores is
  'Una fila por jugador por día. score = correctCount*100 + bonus_tiempo.';

-- ── 4. Columna answers (respuestas detalladas) ───────────────
-- Añadir a una tabla existente (idempotente).
-- Cada elemento: { type, word, selected, correct, isCorrect }
alter table public.daily_scores
  add column if not exists answers jsonb not null default '[]'::jsonb;

comment on column public.daily_scores.answers is
  'Array JSON con las respuestas detalladas: [{type, word, selected, correct, isCorrect}]';
