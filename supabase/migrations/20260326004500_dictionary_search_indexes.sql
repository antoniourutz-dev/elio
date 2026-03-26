create extension if not exists pg_trgm;

create index if not exists idx_diccionario_basque_trgm
on public.diccionario
using gin (lower(trim(basque)) gin_trgm_ops);

create index if not exists idx_diccionario_spanish_trgm
on public.diccionario
using gin (lower(trim(spanish)) gin_trgm_ops);

create index if not exists idx_diccionario_definiciones_texto_trgm
on public.diccionario_definiciones
using gin (lower(trim(texto)) gin_trgm_ops);

create index if not exists idx_diccionario_definiciones_diccionario_id
on public.diccionario_definiciones (diccionario_id);

create index if not exists idx_synonym_groups_word_trgm
on public.synonym_groups
using gin (lower(trim(word)) gin_trgm_ops);

create index if not exists idx_synonym_groups_active_word
on public.synonym_groups (active, word);

create index if not exists idx_synonimoak_2_hitza_trgm
on public.synonimoak_2
using gin (lower(trim(hitza)) gin_trgm_ops);

create index if not exists idx_synonimoak_2_search_text_trgm
on public.synonimoak_2
using gin (lower(trim(search_text)) gin_trgm_ops);

create index if not exists idx_synonimoak_2_active_hitza
on public.synonimoak_2 (active, hitza);

create index if not exists idx_synonimoak_2_active_search_text
on public.synonimoak_2 (active, search_text);
