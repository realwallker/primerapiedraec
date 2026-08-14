-- Primera Piedra EC · Sorteo EP. 03
-- Registro privado, selección reproducible y publicación controlada.

create extension if not exists pgcrypto;

create table if not exists public.giveaway_campaigns (
  id text primary key,
  title text not null,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  draw_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled', 'open', 'closed', 'drawn', 'published')),
  terms_version text not null default '2026-08-13',
  created_at timestamptz not null default now(),
  constraint giveaway_campaign_dates check (closes_at > opens_at)
);

create table if not exists public.giveaway_entries (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null references public.giveaway_campaigns(id) on delete restrict,
  registration_code text not null unique,
  full_name text not null,
  city text not null,
  social_network text not null check (social_network in ('instagram', 'tiktok')),
  social_handle text not null,
  contact_type text not null check (contact_type in ('whatsapp', 'email')),
  contact_value text not null,
  contact_hash text not null,
  social_hash text not null,
  age_confirmed boolean not null,
  ecuador_resident boolean not null,
  pickup_confirmed boolean not null,
  social_declaration boolean not null,
  terms_confirmed boolean not null,
  privacy_confirmed boolean not null,
  public_announcement_confirmed boolean not null,
  social_visits jsonb not null default '{}'::jsonb,
  eligibility_status text not null default 'valid' check (eligibility_status in ('valid', 'review', 'invalid')),
  terms_version text not null,
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  source text not null default 'web',
  unique (campaign_id, contact_hash),
  unique (campaign_id, social_hash)
);

create index if not exists giveaway_entries_campaign_created_idx
  on public.giveaway_entries (campaign_id, created_at desc);
create index if not exists giveaway_entries_campaign_status_idx
  on public.giveaway_entries (campaign_id, eligibility_status);

create table if not exists public.giveaway_admins (
  email text primary key,
  display_name text,
  role text not null default 'admin' check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now()
);

create table if not exists public.giveaway_snapshots (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null references public.giveaway_campaigns(id) on delete restrict,
  entry_ids uuid[] not null,
  entry_count integer not null,
  fingerprint text not null,
  frozen_by text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists giveaway_one_snapshot_per_campaign_idx
  on public.giveaway_snapshots (campaign_id);

create table if not exists public.giveaway_draws (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null references public.giveaway_campaigns(id) on delete restrict,
  snapshot_id uuid not null unique references public.giveaway_snapshots(id) on delete restrict,
  seed text not null,
  winners jsonb not null,
  alternates jsonb not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

alter table public.giveaway_campaigns enable row level security;
alter table public.giveaway_entries enable row level security;
alter table public.giveaway_admins enable row level security;
alter table public.giveaway_snapshots enable row level security;
alter table public.giveaway_draws enable row level security;

revoke all on public.giveaway_campaigns from anon, authenticated;
revoke all on public.giveaway_entries from anon, authenticated;
revoke all on public.giveaway_admins from anon, authenticated;
revoke all on public.giveaway_snapshots from anon, authenticated;
revoke all on public.giveaway_draws from anon, authenticated;

create or replace function public.is_giveaway_admin(p_require_write boolean default false)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.giveaway_admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and (role = 'admin' or (role = 'viewer' and not p_require_write))
  );
$$;

revoke all on function public.is_giveaway_admin(boolean) from public;
grant execute on function public.is_giveaway_admin(boolean) to authenticated;

create or replace function public.get_giveaway_public_state(p_campaign_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  c public.giveaway_campaigns%rowtype;
  d public.giveaway_draws%rowtype;
  public_winners jsonb := '[]'::jsonb;
  stage text;
begin
  select * into c from public.giveaway_campaigns where id = p_campaign_id;
  if not found then
    return jsonb_build_object('configured', false, 'stage', 'unavailable');
  end if;

  if c.status = 'published' then stage := 'published';
  elsif c.status in ('drawn', 'closed') or now() >= c.closes_at then stage := 'closed';
  elsif c.status = 'open' or now() >= c.opens_at then stage := 'open';
  else stage := 'upcoming';
  end if;

  if stage = 'published' then
    select * into d from public.giveaway_draws
      where campaign_id = c.id and published_at is not null
      order by created_at desc limit 1;
    if found then
      select coalesce(jsonb_agg(jsonb_build_object(
        'registrationCode', item ->> 'registrationCode',
        'displayName', item ->> 'fullName',
        'socialHandle', item ->> 'socialHandle'
      )), '[]'::jsonb)
      into public_winners
      from jsonb_array_elements(d.winners) item;
    end if;
  end if;

  return jsonb_build_object(
    'configured', true,
    'campaignId', c.id,
    'title', c.title,
    'stage', stage,
    'opensAt', c.opens_at,
    'closesAt', c.closes_at,
    'drawAt', c.draw_at,
    'termsVersion', c.terms_version,
    'winners', public_winners
  );
end;
$$;

revoke all on function public.get_giveaway_public_state(text) from public;
grant execute on function public.get_giveaway_public_state(text) to anon, authenticated;

create or replace function public.register_giveaway_entry(
  p_campaign_id text,
  p_full_name text,
  p_city text,
  p_social_network text,
  p_social_handle text,
  p_contact_type text,
  p_contact_value text,
  p_age_confirmed boolean,
  p_ecuador_resident boolean,
  p_pickup_confirmed boolean,
  p_social_declaration boolean,
  p_terms_confirmed boolean,
  p_privacy_confirmed boolean,
  p_public_announcement_confirmed boolean,
  p_social_visits jsonb,
  p_source text default 'web'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  c public.giveaway_campaigns%rowtype;
  entry_id uuid := gen_random_uuid();
  code text;
  clean_name text := trim(regexp_replace(coalesce(p_full_name, ''), '\s+', ' ', 'g'));
  clean_city text := trim(regexp_replace(coalesce(p_city, ''), '\s+', ' ', 'g'));
  clean_handle text := lower(regexp_replace(trim(coalesce(p_social_handle, '')), '^@', ''));
  clean_contact text := lower(regexp_replace(trim(coalesce(p_contact_value, '')), '\s+', '', 'g'));
begin
  select * into c from public.giveaway_campaigns where id = p_campaign_id for share;
  if not found then raise exception using errcode = 'P0001', message = 'CAMPAIGN_NOT_FOUND'; end if;
  if not (c.status = 'open' or (c.status = 'scheduled' and now() >= c.opens_at and now() < c.closes_at)) then
    raise exception using errcode = 'P0001', message = 'CAMPAIGN_NOT_OPEN';
  end if;
  if now() < c.opens_at or now() >= c.closes_at then
    raise exception using errcode = 'P0001', message = 'CAMPAIGN_NOT_OPEN';
  end if;
  if length(clean_name) < 4 or length(clean_name) > 100 then raise exception using errcode = 'P0001', message = 'INVALID_NAME'; end if;
  if length(clean_city) < 2 or length(clean_city) > 80 then raise exception using errcode = 'P0001', message = 'INVALID_CITY'; end if;
  if p_social_network not in ('instagram', 'tiktok') then raise exception using errcode = 'P0001', message = 'INVALID_NETWORK'; end if;
  if length(clean_handle) < 2 or length(clean_handle) > 80 or clean_handle !~ '^[a-z0-9._]+$' then raise exception using errcode = 'P0001', message = 'INVALID_HANDLE'; end if;
  if p_contact_type not in ('whatsapp', 'email') or length(clean_contact) < 6 or length(clean_contact) > 150 then raise exception using errcode = 'P0001', message = 'INVALID_CONTACT'; end if;
  if p_contact_type = 'email' and clean_contact !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception using errcode = 'P0001', message = 'INVALID_CONTACT'; end if;
  if not coalesce(p_age_confirmed, false) or not coalesce(p_ecuador_resident, false)
    or not coalesce(p_pickup_confirmed, false) or not coalesce(p_social_declaration, false)
    or not coalesce(p_terms_confirmed, false) or not coalesce(p_privacy_confirmed, false)
    or not coalesce(p_public_announcement_confirmed, false) then
    raise exception using errcode = 'P0001', message = 'CONSENT_REQUIRED';
  end if;
  if not (coalesce((p_social_visits ->> 'youtube')::boolean, false)
    and coalesce((p_social_visits ->> 'instagram')::boolean, false)
    and coalesce((p_social_visits ->> 'tiktok')::boolean, false)) then
    raise exception using errcode = 'P0001', message = 'SOCIAL_ROUTE_REQUIRED';
  end if;

  code := 'PP3-' || upper(substr(replace(entry_id::text, '-', ''), 1, 8));

  insert into public.giveaway_entries (
    id, campaign_id, registration_code, full_name, city, social_network, social_handle,
    contact_type, contact_value, contact_hash, social_hash, age_confirmed,
    ecuador_resident, pickup_confirmed, social_declaration, terms_confirmed, privacy_confirmed,
    public_announcement_confirmed, social_visits, terms_version, source
  ) values (
    entry_id, c.id, code, clean_name, clean_city, p_social_network, '@' || clean_handle,
    p_contact_type, clean_contact,
    encode(digest(c.id || ':contact:' || clean_contact, 'sha256'), 'hex'),
    encode(digest(c.id || ':social:' || p_social_network || ':' || clean_handle, 'sha256'), 'hex'),
    true, true, true, true, true, true, true, p_social_visits, c.terms_version, left(coalesce(p_source, 'web'), 40)
  );

  return jsonb_build_object('ok', true, 'registrationCode', code, 'createdAt', now());
exception
  when unique_violation then
    raise exception using errcode = 'P0001', message = 'DUPLICATE_ENTRY';
end;
$$;

revoke all on function public.register_giveaway_entry(text,text,text,text,text,text,text,boolean,boolean,boolean,boolean,boolean,boolean,boolean,jsonb,text) from public;
grant execute on function public.register_giveaway_entry(text,text,text,text,text,text,text,boolean,boolean,boolean,boolean,boolean,boolean,boolean,jsonb,text) to anon, authenticated;

create or replace function public.admin_giveaway_entries(p_campaign_id text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_giveaway_admin(false) then raise exception using errcode = '42501', message = 'ADMIN_REQUIRED'; end if;
  return jsonb_build_object(
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'registrationCode', registration_code, 'fullName', full_name,
        'city', city, 'socialNetwork', social_network, 'socialHandle', social_handle,
        'contactType', contact_type, 'contactValue', contact_value,
        'status', eligibility_status, 'createdAt', created_at
      ) order by created_at desc)
      from public.giveaway_entries where campaign_id = p_campaign_id
    ), '[]'::jsonb),
    'snapshot', (select jsonb_build_object('id', id, 'entryCount', entry_count, 'fingerprint', fingerprint, 'createdAt', created_at)
      from public.giveaway_snapshots where campaign_id = p_campaign_id limit 1),
    'draw', (select jsonb_build_object('id', id, 'winners', winners, 'alternates', alternates, 'createdAt', created_at, 'publishedAt', published_at)
      from public.giveaway_draws where campaign_id = p_campaign_id limit 1)
  );
end;
$$;

revoke all on function public.admin_giveaway_entries(text) from public;
grant execute on function public.admin_giveaway_entries(text) to authenticated;

create or replace function public.admin_set_entry_status(p_entry_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_giveaway_admin(true) then raise exception using errcode = '42501', message = 'ADMIN_REQUIRED'; end if;
  if p_status not in ('valid', 'review', 'invalid') then raise exception using errcode = 'P0001', message = 'INVALID_STATUS'; end if;
  if exists (select 1 from public.giveaway_snapshots s join public.giveaway_entries e on e.campaign_id = s.campaign_id where e.id = p_entry_id) then
    raise exception using errcode = 'P0001', message = 'SNAPSHOT_ALREADY_FROZEN';
  end if;
  update public.giveaway_entries set eligibility_status = p_status where id = p_entry_id;
  if not found then raise exception using errcode = 'P0001', message = 'ENTRY_NOT_FOUND'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_set_entry_status(uuid,text) from public;
grant execute on function public.admin_set_entry_status(uuid,text) to authenticated;

create or replace function public.admin_freeze_giveaway(p_campaign_id text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  ids uuid[];
  snap public.giveaway_snapshots%rowtype;
  admin_email text := lower(coalesce(auth.jwt() ->> 'email', 'unknown'));
begin
  if not public.is_giveaway_admin(true) then raise exception using errcode = '42501', message = 'ADMIN_REQUIRED'; end if;
  select * into snap from public.giveaway_snapshots where campaign_id = p_campaign_id;
  if found then return jsonb_build_object('id', snap.id, 'entryCount', snap.entry_count, 'fingerprint', snap.fingerprint, 'createdAt', snap.created_at); end if;

  select array_agg(id order by id) into ids from public.giveaway_entries
    where campaign_id = p_campaign_id and eligibility_status = 'valid';
  if coalesce(array_length(ids, 1), 0) < 4 then raise exception using errcode = 'P0001', message = 'NOT_ENOUGH_VALID_ENTRIES'; end if;

  insert into public.giveaway_snapshots (campaign_id, entry_ids, entry_count, fingerprint, frozen_by)
  values (p_campaign_id, ids, array_length(ids, 1), encode(digest(array_to_string(ids, ','), 'sha256'), 'hex'), admin_email)
  returning * into snap;
  update public.giveaway_campaigns set status = 'closed' where id = p_campaign_id and status in ('scheduled', 'open');
  return jsonb_build_object('id', snap.id, 'entryCount', snap.entry_count, 'fingerprint', snap.fingerprint, 'createdAt', snap.created_at);
end;
$$;

revoke all on function public.admin_freeze_giveaway(text) from public;
grant execute on function public.admin_freeze_giveaway(text) to authenticated;

create or replace function public.admin_draw_giveaway(p_campaign_id text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  snap public.giveaway_snapshots%rowtype;
  existing public.giveaway_draws%rowtype;
  new_draw public.giveaway_draws%rowtype;
  draw_seed text := encode(gen_random_bytes(32), 'hex');
  winner_data jsonb;
  alternate_data jsonb;
  admin_email text := lower(coalesce(auth.jwt() ->> 'email', 'unknown'));
begin
  if not public.is_giveaway_admin(true) then raise exception using errcode = '42501', message = 'ADMIN_REQUIRED'; end if;
  select * into existing from public.giveaway_draws where campaign_id = p_campaign_id;
  if found then return jsonb_build_object('id', existing.id, 'winners', existing.winners, 'alternates', existing.alternates, 'createdAt', existing.created_at, 'publishedAt', existing.published_at); end if;
  select * into snap from public.giveaway_snapshots where campaign_id = p_campaign_id;
  if not found then raise exception using errcode = 'P0001', message = 'SNAPSHOT_REQUIRED'; end if;

  with ranked as (
    select e.*, row_number() over (order by digest(e.id::text || draw_seed, 'sha256')) as position
    from public.giveaway_entries e where e.id = any(snap.entry_ids)
  )
  select
    coalesce(jsonb_agg(jsonb_build_object('id', id, 'registrationCode', registration_code, 'fullName', full_name, 'city', city, 'socialHandle', social_handle, 'contactType', contact_type, 'contactValue', contact_value) order by position) filter (where position <= 2), '[]'::jsonb),
    coalesce(jsonb_agg(jsonb_build_object('id', id, 'registrationCode', registration_code, 'fullName', full_name, 'city', city, 'socialHandle', social_handle, 'contactType', contact_type, 'contactValue', contact_value) order by position) filter (where position between 3 and 4), '[]'::jsonb)
  into winner_data, alternate_data from ranked;

  insert into public.giveaway_draws (campaign_id, snapshot_id, seed, winners, alternates, created_by)
  values (p_campaign_id, snap.id, draw_seed, winner_data, alternate_data, admin_email)
  returning * into new_draw;
  update public.giveaway_campaigns set status = 'drawn' where id = p_campaign_id;
  return jsonb_build_object('id', new_draw.id, 'winners', new_draw.winners, 'alternates', new_draw.alternates, 'createdAt', new_draw.created_at);
end;
$$;

revoke all on function public.admin_draw_giveaway(text) from public;
grant execute on function public.admin_draw_giveaway(text) to authenticated;

create or replace function public.admin_publish_giveaway(p_campaign_id text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  published timestamptz;
begin
  if not public.is_giveaway_admin(true) then raise exception using errcode = '42501', message = 'ADMIN_REQUIRED'; end if;
  update public.giveaway_draws set published_at = coalesce(published_at, now())
    where campaign_id = p_campaign_id returning published_at into published;
  if not found then raise exception using errcode = 'P0001', message = 'DRAW_REQUIRED'; end if;
  update public.giveaway_campaigns set status = 'published' where id = p_campaign_id;
  return jsonb_build_object('ok', true, 'publishedAt', published);
end;
$$;

revoke all on function public.admin_publish_giveaway(text) from public;
grant execute on function public.admin_publish_giveaway(text) to authenticated;

insert into public.giveaway_campaigns (id, title, opens_at, closes_at, draw_at, status, terms_version)
values
  ('ep03-boris-2026', 'El conejito Boris y sus monedas · EP. 03', '2026-08-18 07:00:00-05', '2026-08-23 20:00:00-05', '2026-08-24 10:00:00-05', 'scheduled', '2026-08-13'),
  ('ep03-boris-2026-preview', 'Preview · El conejito Boris y sus monedas', '2026-08-01 00:00:00-05', '2026-09-01 00:00:00-05', '2026-09-01 10:00:00-05', 'open', '2026-08-13')
on conflict (id) do update set
  title = excluded.title,
  opens_at = excluded.opens_at,
  closes_at = excluded.closes_at,
  draw_at = excluded.draw_at,
  terms_version = excluded.terms_version;

comment on table public.giveaway_entries is 'Datos privados de participantes del sorteo EP. 03. Sin acceso directo desde clientes.';
comment on table public.giveaway_draws is 'Resultado inmutable por snapshot; publicación explícita y separada.';
