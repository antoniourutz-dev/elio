create extension if not exists pgcrypto;

create table if not exists public.euskera_synonyms (
  id uuid primary key default gen_random_uuid(),
  basque_word text not null,
  synonyms text[] not null check (cardinality(synonyms) > 0),
  difficulty smallint not null default 1 check (difficulty between 1 and 4),
  theme text,
  translation_es text,
  example_sentence text,
  exercise_order smallint check (exercise_order between 1 and 10),
  tags text[] not null default '{}'::text[],
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists euskera_synonyms_word_idx on public.euskera_synonyms (basque_word);
create index if not exists euskera_synonyms_difficulty_idx on public.euskera_synonyms (difficulty);
create index if not exists euskera_synonyms_exercise_idx on public.euskera_synonyms (exercise_order);
create index if not exists euskera_synonyms_active_idx on public.euskera_synonyms (active);

create or replace function public.set_euskera_synonyms_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_euskera_synonyms_updated_at on public.euskera_synonyms;

create trigger trg_euskera_synonyms_updated_at
before update on public.euskera_synonyms
for each row
execute function public.set_euskera_synonyms_updated_at();

alter table public.euskera_synonyms enable row level security;

drop policy if exists "Public can read active euskera synonyms" on public.euskera_synonyms;
create policy "Public can read active euskera synonyms"
on public.euskera_synonyms
for select
to anon, authenticated
using (active = true);

drop policy if exists "Authenticated can manage euskera synonyms" on public.euskera_synonyms;
create policy "Authenticated can manage euskera synonyms"
on public.euskera_synonyms
for all
to authenticated
using (true)
with check (true);

comment on table public.euskera_synonyms is
  'Banco de sinonimos para la ruta de 10 ejercicios de euskera.';

comment on column public.euskera_synonyms.exercise_order is
  'Permite asociar palabras a uno de los 10 ejercicios. Si es null, la app usara la dificultad y el tema para decidir.';

comment on column public.euskera_synonyms.translation_es is
  'Pista opcional en castellano para alumnado principiante.';

comment on column public.euskera_synonyms.example_sentence is
  'Ejemplo opcional para los bloques contextuales.';

-- Ejemplos de insercion. Ajustalos a tu contenido real antes de usarlos.
-- insert into public.euskera_synonyms
--   (basque_word, synonyms, difficulty, theme, translation_es, example_sentence, exercise_order, tags)
-- values
--   ('eder', array['polita', 'dotorea'], 1, 'deskribapenak', 'bonito', 'Herria oso ederra da.', 1, array['oinarria', 'adjektiboa']),
--   ('azkar', array['bizkor', 'arin'], 2, 'deskribapenak', 'rapido', 'Ikaslea oso azkar ibili da.', 4, array['abiadura']),
--   ('amaitu', array['bukatu', 'burutu'], 2, 'ekintzak', 'terminar', 'Ariketa garaiz amaitu dugu.', 4, array['aditza']);
