create or replace function public.is_irakasle()
returns boolean
language sql
stable
as $$
  select split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1) in ('irakasle', 'admin');
$$;

alter table public.player_progress
  add column if not exists forced_unlock_level smallint not null default 1;

alter table public.player_progress
  add column if not exists forced_unlock_levels smallint[] not null default '{}'::smallint[];

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'player_progress_forced_unlock_level_check'
      and conrelid = 'public.player_progress'::regclass
  ) then
    alter table public.player_progress
      add constraint player_progress_forced_unlock_level_check
      check (forced_unlock_level between 1 and 10);
  end if;
end
$$;

update public.player_progress
set forced_unlock_level = least(greatest(coalesce(forced_unlock_level, 1), 1), 10)
where forced_unlock_level is null
   or forced_unlock_level < 1
   or forced_unlock_level > 10;

update public.player_progress
set forced_unlock_levels = case
  when coalesce(array_length(forced_unlock_levels, 1), 0) > 0 then (
    select coalesce(array_agg(distinct level order by level), '{}'::smallint[])
    from unnest(forced_unlock_levels) as level
    where level between 2 and 10
  )
  when forced_unlock_level > 1 then (
    select array_agg(level order by level)::smallint[]
    from generate_series(2, forced_unlock_level) as level
  )
  else '{}'::smallint[]
end;

alter table public.player_progress enable row level security;

drop policy if exists player_progress_teacher_select on public.player_progress;
create policy player_progress_teacher_select on public.player_progress
for select
to authenticated
using (public.is_irakasle());

drop policy if exists player_progress_teacher_insert on public.player_progress;
create policy player_progress_teacher_insert on public.player_progress
for insert
to authenticated
with check (public.is_irakasle());

drop policy if exists player_progress_teacher_update on public.player_progress;
create policy player_progress_teacher_update on public.player_progress
for update
to authenticated
using (public.is_irakasle())
with check (public.is_irakasle());

drop policy if exists player_progress_teacher_delete on public.player_progress;
create policy player_progress_teacher_delete on public.player_progress
for delete
to authenticated
using (public.is_irakasle());

alter table public.synonym_groups enable row level security;

drop policy if exists synonym_groups_teacher_insert on public.synonym_groups;
create policy synonym_groups_teacher_insert on public.synonym_groups
for insert
to authenticated
with check (public.is_irakasle());

drop policy if exists synonym_groups_teacher_update on public.synonym_groups;
create policy synonym_groups_teacher_update on public.synonym_groups
for update
to authenticated
using (public.is_irakasle())
with check (public.is_irakasle());

drop policy if exists synonym_groups_teacher_delete on public.synonym_groups;
create policy synonym_groups_teacher_delete on public.synonym_groups
for delete
to authenticated
using (public.is_irakasle());

create or replace function public.teacher_list_players()
returns table (
  owner_id uuid,
  player_code text,
  player_email text,
  learner_name text,
  level_records jsonb,
  forced_unlock_levels smallint[],
  forced_unlock_level smallint,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if not public.is_irakasle() then
    raise exception 'Ez duzu baimenik ekintza hau egiteko.';
  end if;

  return query
  select
    pp.owner_id,
    pp.player_code,
    pp.player_email,
    pp.learner_name,
    pp.level_records,
    pp.forced_unlock_levels,
    pp.forced_unlock_level,
    pp.created_at,
    pp.updated_at
  from public.player_progress as pp
  inner join auth.users as au
    on au.id = pp.owner_id
  order by pp.player_code asc;
end;
$$;

grant execute on function public.teacher_list_players() to authenticated;

create or replace function public.teacher_create_player_access(
  next_player_code text,
  next_password text,
  next_learner_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  normalized_code text := lower(regexp_replace(coalesce(next_player_code, ''), '\s+', '', 'g'));
  normalized_name text := nullif(btrim(coalesce(next_learner_name, '')), '');
  normalized_password text := nullif(btrim(coalesce(next_password, '')), '');
  next_player_email text := normalized_code || '@lexiko.app';
  new_user_id uuid := gen_random_uuid();
  now_utc timestamptz := timezone('utc', now());
begin
  if not public.is_irakasle() then
    raise exception 'Ez duzu baimenik ekintza hau egiteko.';
  end if;

  if normalized_code = '' then
    raise exception 'Erabiltzaile kodea behar da.';
  end if;

  if normalized_code !~ '^[a-z0-9_-]+$' then
    raise exception 'Kodeak letrak, zenbakiak, marratxoa edo azpimarra bakarrik izan ditzake.';
  end if;

  if normalized_code in ('irakasle', 'admin') then
    raise exception '% kodea erreserbatuta dago.', normalized_code;
  end if;

  if normalized_password is null or char_length(normalized_password) < 3 then
    raise exception 'Pasahitzak gutxienez 3 karaktere izan behar ditu.';
  end if;

  if exists (
    select 1
    from public.player_progress as pp
    inner join auth.users as au
      on au.id = pp.owner_id
    where pp.player_code = normalized_code
  ) then
    raise exception 'Erabiltzaile kode hori lehendik badago.';
  end if;

  if exists (
    select 1
    from auth.users
    where email = next_player_email
  ) then
    raise exception 'Erabiltzaile email hori lehendik badago.';
  end if;

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    email_change_token_current,
    email_change_confirm_status,
    reauthentication_token,
    is_sso_user,
    is_anonymous
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    next_player_email,
    crypt(normalized_password, gen_salt('bf')),
    now_utc,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now_utc,
    now_utc,
    '',
    '',
    '',
    '',
    '',
    0,
    '',
    false,
    false
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    new_user_id,
    jsonb_build_object(
      'sub', new_user_id::text,
      'email', next_player_email,
      'email_verified', true
    ),
    'email',
    new_user_id::text,
    now_utc,
    now_utc,
    now_utc
  );

  insert into public.player_progress (
    owner_id,
    player_code,
    player_email,
    learner_name,
    level_records,
    forced_unlock_level,
    forced_unlock_levels,
    created_at,
    updated_at
  )
  values (
    new_user_id,
    normalized_code,
    next_player_email,
    coalesce(normalized_name, initcap(normalized_code)),
    '[]'::jsonb,
    1,
    '{}'::smallint[],
    now_utc,
    now_utc
  );

  return new_user_id;
end;
$$;

grant execute on function public.teacher_create_player_access(text, text, text) to authenticated;

create or replace function public.teacher_update_player_access(
  target_owner_id uuid,
  next_player_code text,
  next_learner_name text default null,
  next_password text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  normalized_code text := lower(regexp_replace(coalesce(next_player_code, ''), '\s+', '', 'g'));
  normalized_name text := nullif(btrim(coalesce(next_learner_name, '')), '');
  normalized_password text := nullif(btrim(coalesce(next_password, '')), '');
  next_player_email text := normalized_code || '@lexiko.app';
  current_player_code text;
begin
  if not public.is_irakasle() then
    raise exception 'Ez duzu baimenik ekintza hau egiteko.';
  end if;

  if normalized_code = '' then
    raise exception 'Erabiltzaile kodea behar da.';
  end if;

  if normalized_code !~ '^[a-z0-9_-]+$' then
    raise exception 'Kodeak letrak, zenbakiak, marratxoa edo azpimarra bakarrik izan ditzake.';
  end if;

  select pp.player_code
  into current_player_code
  from public.player_progress as pp
  where pp.owner_id = target_owner_id;

  if current_player_code is null then
    raise exception 'Ez da jokalaria aurkitu.';
  end if;

  if normalized_code in ('irakasle', 'admin') and current_player_code <> normalized_code then
    raise exception '% kodea erreserbatuta dago.', normalized_code;
  end if;

  if normalized_password is not null and char_length(normalized_password) < 3 then
    raise exception 'Pasahitzak gutxienez 3 karaktere izan behar ditu.';
  end if;

  if exists (
    select 1
    from public.player_progress as pp
    inner join auth.users as au
      on au.id = pp.owner_id
    where pp.owner_id <> target_owner_id
      and pp.player_code = normalized_code
  ) then
    raise exception 'Erabiltzaile kode hori lehendik badago.';
  end if;

  if exists (
    select 1
    from auth.users
    where id <> target_owner_id
      and email = next_player_email
  ) then
    raise exception 'Erabiltzaile email hori lehendik badago.';
  end if;

  update auth.users
  set
    email = next_player_email,
    encrypted_password = case
      when normalized_password is null then encrypted_password
      else crypt(normalized_password, gen_salt('bf'))
    end,
    email_confirmed_at = coalesce(email_confirmed_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  where id = target_owner_id;

  if not found then
    raise exception 'Ez da jokalaria aurkitu.';
  end if;

  update public.player_progress
  set
    player_code = normalized_code,
    player_email = next_player_email,
    learner_name = coalesce(normalized_name, initcap(normalized_code)),
    updated_at = timezone('utc', now())
  where owner_id = target_owner_id;

  if not found then
    raise exception 'Ez da jokalariaren profila aurkitu.';
  end if;
end;
$$;

grant execute on function public.teacher_update_player_access(uuid, text, text, text) to authenticated;

create or replace function public.teacher_delete_player_account(
  target_owner_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  target_player_code text;
begin
  if not public.is_irakasle() then
    raise exception 'Ez duzu baimenik ekintza hau egiteko.';
  end if;

  select pp.player_code
  into target_player_code
  from public.player_progress as pp
  where pp.owner_id = target_owner_id;

  if target_player_code is null then
    raise exception 'Ez da jokalaria aurkitu.';
  end if;

  if target_player_code in ('irakasle', 'admin') or target_owner_id = auth.uid() then
    raise exception 'Administratzailea ezin da ezabatu.';
  end if;

  delete from public.player_progress
  where owner_id = target_owner_id;

  delete from auth.identities
  where user_id = target_owner_id;

  delete from auth.users
  where id = target_owner_id;

  if not found then
    raise exception 'Ez da jokalaria aurkitu.';
  end if;
end;
$$;

grant execute on function public.teacher_delete_player_account(uuid) to authenticated;

create or replace function public.player_set_short_password(
  next_password text
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  normalized_password text := nullif(btrim(coalesce(next_password, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Saioa hasi behar da ekintza hau egiteko.';
  end if;

  if normalized_password is null or char_length(normalized_password) < 3 then
    raise exception 'Pasahitzak gutxienez 3 karaktere izan behar ditu.';
  end if;

  update auth.users
  set
    encrypted_password = crypt(normalized_password, gen_salt('bf')),
    updated_at = timezone('utc', now())
  where id = auth.uid();

  if not found then
    raise exception 'Ez da erabiltzailea aurkitu.';
  end if;
end;
$$;

grant execute on function public.player_set_short_password(text) to authenticated;
