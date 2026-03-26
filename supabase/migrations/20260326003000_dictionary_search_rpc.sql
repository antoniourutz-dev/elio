create or replace function public.search_dictionary_entries(
  search_query text,
  search_mode text default 'contains',
  requested_page integer default 1,
  requested_page_size integer default 24
)
returns table (
  key text,
  basque text,
  spanish text,
  definitions jsonb,
  synonyms jsonb,
  score integer,
  source text,
  total_count bigint
)
language sql
stable
as $$
with params as (
  select
    lower(trim(search_query)) as q,
    greatest(coalesce(requested_page, 1), 1) as page_number,
    greatest(coalesce(requested_page_size, 24), 1) as page_size,
    case
      when lower(coalesce(search_mode, 'contains')) in ('exact', 'prefix', 'suffix', 'contains')
        then lower(search_mode)
      else 'contains'
    end as mode
),
dictionary_matches as (
  select
    lower(trim(d.basque)) as result_key,
    trim(d.basque) as basque,
    trim(d.spanish) as spanish,
    case
      when lower(trim(d.basque)) = p.q then 600
      when p.mode = 'prefix' and lower(trim(d.basque)) like p.q || '%' then 360
      when p.mode = 'suffix' and lower(trim(d.basque)) like '%' || p.q then 220
      when p.mode = 'contains' and lower(trim(d.basque)) like '%' || p.q || '%' then 220
      when lower(coalesce(d.spanish, '')) = p.q then 200
      when p.mode = 'prefix' and lower(coalesce(d.spanish, '')) like p.q || '%' then 140
      when p.mode = 'suffix' and lower(coalesce(d.spanish, '')) like '%' || p.q then 90
      when p.mode = 'contains' and lower(coalesce(d.spanish, '')) like '%' || p.q || '%' then 90
      else 0
    end as score,
    'dictionary'::text as source
  from public.diccionario d
  cross join params p
  where
    char_length(p.q) >= 2
    and (
      (p.mode = 'exact' and (lower(trim(d.basque)) = p.q or lower(coalesce(d.spanish, '')) = p.q))
      or (p.mode = 'prefix' and (lower(trim(d.basque)) like p.q || '%' or lower(coalesce(d.spanish, '')) like p.q || '%'))
      or (p.mode = 'suffix' and (lower(trim(d.basque)) like '%' || p.q or lower(coalesce(d.spanish, '')) like '%' || p.q))
      or (p.mode = 'contains' and (lower(trim(d.basque)) like '%' || p.q || '%' or lower(coalesce(d.spanish, '')) like '%' || p.q || '%'))
    )
),
definition_matches as (
  select
    lower(trim(d.basque)) as result_key,
    trim(d.basque) as basque,
    trim(d.spanish) as spanish,
    case
      when lower(trim(dd.texto)) = p.q then 110
      when p.mode = 'prefix' and lower(trim(dd.texto)) like p.q || '%' then 80
      when p.mode = 'suffix' and lower(trim(dd.texto)) like '%' || p.q then 45
      when p.mode = 'contains' and lower(trim(dd.texto)) like '%' || p.q || '%' then 45
      else 0
    end as score,
    'dictionary'::text as source
  from public.diccionario_definiciones dd
  join public.diccionario d on d.id = dd.diccionario_id
  cross join params p
  where
    char_length(p.q) >= 2
    and (
      (p.mode = 'exact' and lower(trim(dd.texto)) = p.q)
      or (p.mode = 'prefix' and lower(trim(dd.texto)) like p.q || '%')
      or (p.mode = 'suffix' and lower(trim(dd.texto)) like '%' || p.q)
      or (p.mode = 'contains' and lower(trim(dd.texto)) like '%' || p.q || '%')
    )
),
primary_synonym_matches as (
  select
    lower(trim(sg.word)) as result_key,
    trim(sg.word) as basque,
    null::text as spanish,
    case
      when lower(trim(sg.word)) = p.q then 320
      when p.mode = 'prefix' and lower(trim(sg.word)) like p.q || '%' then 220
      when p.mode = 'suffix' and lower(trim(sg.word)) like '%' || p.q then 120
      when p.mode = 'contains' and lower(trim(sg.word)) like '%' || p.q || '%' then 120
      else 0
    end as score,
    'synonym_only'::text as source
  from public.synonym_groups sg
  cross join params p
  where
    coalesce(sg.active, true)
    and char_length(p.q) >= 2
    and (
      (p.mode = 'exact' and (
        lower(trim(sg.word)) = p.q
        or exists (
          select 1
          from unnest(sg.synonyms) as synonym_item
          where lower(trim(synonym_item)) = p.q
        )
      ))
      or (p.mode = 'prefix' and (
        lower(trim(sg.word)) like p.q || '%'
        or exists (
          select 1
          from unnest(sg.synonyms) as synonym_item
          where lower(trim(synonym_item)) like p.q || '%'
        )
      ))
      or (p.mode = 'suffix' and (
        lower(trim(sg.word)) like '%' || p.q
        or exists (
          select 1
          from unnest(sg.synonyms) as synonym_item
          where lower(trim(synonym_item)) like '%' || p.q
        )
      ))
      or (p.mode = 'contains' and (
        lower(trim(sg.word)) like '%' || p.q || '%'
        or exists (
          select 1
          from unnest(sg.synonyms) as synonym_item
          where lower(trim(synonym_item)) like '%' || p.q || '%'
        )
      ))
    )
),
secondary_synonym_matches as (
  select
    lower(trim(s2.hitza)) as result_key,
    trim(s2.hitza) as basque,
    null::text as spanish,
    case
      when lower(trim(s2.hitza)) = p.q then 320
      when p.mode = 'prefix' and lower(trim(s2.hitza)) like p.q || '%' then 220
      when p.mode = 'suffix' and lower(trim(s2.hitza)) like '%' || p.q then 120
      when p.mode = 'contains' and lower(trim(s2.hitza)) like '%' || p.q || '%' then 120
      when p.mode = 'exact' and lower(coalesce(trim(s2.search_text), '')) = p.q then 220
      when p.mode = 'prefix' and lower(coalesce(trim(s2.search_text), '')) like p.q || '%' then 140
      when p.mode = 'suffix' and lower(coalesce(trim(s2.search_text), '')) like '%' || p.q then 90
      when p.mode = 'contains' and lower(coalesce(trim(s2.search_text), '')) like '%' || p.q || '%' then 90
      else 0
    end as score,
    'synonym_only'::text as source
  from public.synonimoak_2 s2
  cross join params p
  where
    coalesce(s2.active, true)
    and char_length(p.q) >= 2
    and (
      (p.mode = 'exact' and (
        lower(trim(s2.hitza)) = p.q
        or lower(coalesce(trim(s2.search_text), '')) = p.q
        or exists (
          select 1
          from jsonb_array_elements_text(
            case
              when jsonb_typeof(s2.sinonimoak) = 'array' then s2.sinonimoak
              else '[]'::jsonb
            end
          ) as synonym_item
          where lower(trim(synonym_item)) = p.q
        )
      ))
      or (p.mode = 'prefix' and (
        lower(trim(s2.hitza)) like p.q || '%'
        or lower(coalesce(trim(s2.search_text), '')) like p.q || '%'
        or exists (
          select 1
          from jsonb_array_elements_text(
            case
              when jsonb_typeof(s2.sinonimoak) = 'array' then s2.sinonimoak
              else '[]'::jsonb
            end
          ) as synonym_item
          where lower(trim(synonym_item)) like p.q || '%'
        )
      ))
      or (p.mode = 'suffix' and (
        lower(trim(s2.hitza)) like '%' || p.q
        or lower(coalesce(trim(s2.search_text), '')) like '%' || p.q
        or exists (
          select 1
          from jsonb_array_elements_text(
            case
              when jsonb_typeof(s2.sinonimoak) = 'array' then s2.sinonimoak
              else '[]'::jsonb
            end
          ) as synonym_item
          where lower(trim(synonym_item)) like '%' || p.q
        )
      ))
      or (p.mode = 'contains' and (
        lower(trim(s2.hitza)) like '%' || p.q || '%'
        or lower(coalesce(trim(s2.search_text), '')) like '%' || p.q || '%'
        or exists (
          select 1
          from jsonb_array_elements_text(
            case
              when jsonb_typeof(s2.sinonimoak) = 'array' then s2.sinonimoak
              else '[]'::jsonb
            end
          ) as synonym_item
          where lower(trim(synonym_item)) like '%' || p.q || '%'
        )
      ))
    )
),
all_matches as (
  select * from dictionary_matches
  union all
  select * from definition_matches
  union all
  select * from primary_synonym_matches
  union all
  select * from secondary_synonym_matches
),
merged_matches as (
  select
    result_key,
    max(basque) as basque,
    max(spanish) filter (where spanish is not null and spanish <> '') as spanish,
    max(score) as score,
    case
      when bool_or(source = 'dictionary') then 'dictionary'
      else 'synonym_only'
    end as source
  from all_matches
  group by result_key
),
dictionary_exact as (
  select
    lower(trim(d.basque)) as result_key,
    d.id as dictionary_id,
    trim(d.basque) as basque,
    trim(d.spanish) as spanish
  from public.diccionario d
),
definitions_agg as (
  select
    dd.diccionario_id,
    jsonb_agg(
      jsonb_build_object(
        'id', dd.id,
        'text', trim(dd.texto),
        'order', coalesce(dd.orden, 0)
      )
      order by coalesce(dd.orden, 0), trim(dd.texto)
    ) as definitions
  from public.diccionario_definiciones dd
  where trim(coalesce(dd.texto, '')) <> ''
  group by dd.diccionario_id
),
synonym_union as (
  select
    lower(trim(sg.word)) as result_key,
    trim(synonym_item) as synonym
  from public.synonym_groups sg,
  lateral unnest(sg.synonyms) as synonym_item
  where coalesce(sg.active, true)
    and trim(coalesce(synonym_item, '')) <> ''

  union all

  select
    lower(trim(s2.hitza)) as result_key,
    trim(synonym_item) as synonym
  from public.synonimoak_2 s2,
  lateral jsonb_array_elements_text(
    case
      when jsonb_typeof(s2.sinonimoak) = 'array' then s2.sinonimoak
      else '[]'::jsonb
    end
  ) as synonym_item
  where coalesce(s2.active, true)
    and trim(coalesce(synonym_item, '')) <> ''
),
synonyms_agg as (
  select
    result_key,
    jsonb_agg(distinct synonym order by synonym) as synonyms
  from synonym_union
  group by result_key
),
enriched as (
  select
    merged.result_key as key,
    coalesce(dict.basque, merged.basque) as basque,
    coalesce(dict.spanish, merged.spanish) as spanish,
    coalesce(defs.definitions, '[]'::jsonb) as definitions,
    coalesce(syns.synonyms, '[]'::jsonb) as synonyms,
    merged.score,
    merged.source
  from merged_matches merged
  left join dictionary_exact dict on dict.result_key = merged.result_key
  left join definitions_agg defs on defs.diccionario_id = dict.dictionary_id
  left join synonyms_agg syns on syns.result_key = merged.result_key
),
ranked as (
  select
    enriched.*,
    count(*) over() as total_count
  from enriched
  order by enriched.score desc, enriched.basque asc
  limit (select page_size from params)
  offset (
    ((select page_number from params) - 1) * (select page_size from params)
  )
)
select
  ranked.key,
  ranked.basque,
  ranked.spanish,
  ranked.definitions,
  ranked.synonyms,
  ranked.score,
  ranked.source,
  ranked.total_count
from ranked;
$$;
