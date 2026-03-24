do $$
begin
  if not exists (
    select 1
    from pg_index index_info
    join pg_class index_class
      on index_class.oid = index_info.indexrelid
    join pg_class table_class
      on table_class.oid = index_info.indrelid
    join pg_namespace table_namespace
      on table_namespace.oid = table_class.relnamespace
    join unnest(index_info.indkey) with ordinality as index_keys(attnum, ordinality)
      on true
    join pg_attribute attribute_info
      on attribute_info.attrelid = table_class.oid
     and attribute_info.attnum = index_keys.attnum
    where table_namespace.nspname = 'public'
      and table_class.relname = 'verb_forms'
      and index_info.indisunique
    group by index_class.oid
    having array_agg(attribute_info.attname order by index_keys.ordinality) = array['lookup_key']
  ) then
    create unique index verb_forms_lookup_key_idx
      on public.verb_forms (lookup_key);
  end if;
end;
$$;

create or replace function public.set_verb_forms_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_verb_forms_updated_at on public.verb_forms;

create trigger trg_set_verb_forms_updated_at
before update on public.verb_forms
for each row
execute function public.set_verb_forms_updated_at();
