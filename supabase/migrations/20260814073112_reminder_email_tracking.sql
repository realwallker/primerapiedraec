alter table public.giveaway_waitlist
  add column if not exists confirmation_attempted_at timestamptz,
  add column if not exists confirmation_sent_at timestamptz;

create or replace function public.join_giveaway_waitlist(
  p_campaign_id text,
  p_email text,
  p_consent boolean,
  p_request_context text default '',
  p_source text default 'hub'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  c public.giveaway_campaigns%rowtype;
  clean_email text := lower(regexp_replace(trim(coalesce(p_email, '')), '\s+', '', 'g'));
  fingerprint_key bytea;
  computed_request_hash text;
  waitlist_id uuid;
  confirmation_sent timestamptz;
  created boolean := false;
  should_send boolean := false;
begin
  select * into c from public.giveaway_campaigns where id = p_campaign_id;
  if not found or (now() >= c.opens_at and c.id !~ '-preview$') then
    raise exception using errcode = 'P0001', message = 'WAITLIST_CLOSED';
  end if;

  select s.fingerprint_key into fingerprint_key
  from public.giveaway_secrets s
  where s.campaign_id = c.id;

  if not found or length(p_request_context) < 3 or length(p_request_context) > 600 then
    raise exception using errcode = 'P0001', message = 'ANTI_ABUSE_NOT_CONFIGURED';
  end if;

  computed_request_hash := encode(
    extensions.hmac(convert_to(p_request_context, 'UTF8'), fingerprint_key, 'sha256'),
    'hex'
  );

  if clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(clean_email) > 150 then
    raise exception using errcode = 'P0001', message = 'INVALID_EMAIL';
  end if;
  if not coalesce(p_consent, false) then
    raise exception using errcode = 'P0001', message = 'WAITLIST_CONSENT_REQUIRED';
  end if;
  if (
    select count(*)
    from public.giveaway_waitlist
    where campaign_id = c.id
      and request_hash = computed_request_hash
      and consent_at >= now() - interval '24 hours'
  ) >= 15 then
    raise exception using errcode = 'P0001', message = 'TOO_MANY_REQUESTS';
  end if;

  insert into public.giveaway_waitlist (
    campaign_id, email, email_hash, consent_confirmed, source, request_hash,
    confirmation_attempted_at
  ) values (
    c.id,
    clean_email,
    encode(extensions.digest(c.id || ':waitlist:' || clean_email, 'sha256'), 'hex'),
    true,
    left(coalesce(p_source, 'hub'), 40),
    computed_request_hash,
    now()
  )
  on conflict (campaign_id, email_hash) do nothing
  returning id, confirmation_sent_at into waitlist_id, confirmation_sent;

  if found then
    created := true;
    should_send := true;
  else
    update public.giveaway_waitlist
    set request_hash = computed_request_hash,
        confirmation_attempted_at = now()
    where campaign_id = c.id
      and email_hash = encode(extensions.digest(c.id || ':waitlist:' || clean_email, 'sha256'), 'hex')
      and confirmation_sent_at is null
      and (
        confirmation_attempted_at is null
        or confirmation_attempted_at <= now() - interval '10 minutes'
      )
    returning id, confirmation_sent_at into waitlist_id, confirmation_sent;

    if found then
      should_send := true;
    else
      select id, confirmation_sent_at into waitlist_id, confirmation_sent
      from public.giveaway_waitlist
      where campaign_id = c.id
        and email_hash = encode(extensions.digest(c.id || ':waitlist:' || clean_email, 'sha256'), 'hex');
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'created', created,
    'shouldSend', should_send,
    'waitlistId', waitlist_id,
    'confirmationSent', confirmation_sent is not null
  );
end;
$$;

revoke all on function public.join_giveaway_waitlist(text,text,boolean,text,text) from public;
grant execute on function public.join_giveaway_waitlist(text,text,boolean,text,text) to anon, authenticated;

create or replace function public.complete_waitlist_confirmation(
  p_campaign_id text,
  p_waitlist_id uuid,
  p_request_context text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  fingerprint_key bytea;
  computed_request_hash text;
begin
  select s.fingerprint_key into fingerprint_key
  from public.giveaway_secrets s
  where s.campaign_id = p_campaign_id;

  if not found or length(p_request_context) < 3 or length(p_request_context) > 600 then
    raise exception using errcode = 'P0001', message = 'ANTI_ABUSE_NOT_CONFIGURED';
  end if;

  computed_request_hash := encode(
    extensions.hmac(convert_to(p_request_context, 'UTF8'), fingerprint_key, 'sha256'),
    'hex'
  );

  update public.giveaway_waitlist
  set confirmation_sent_at = coalesce(confirmation_sent_at, now())
  where id = p_waitlist_id
    and campaign_id = p_campaign_id
    and request_hash = computed_request_hash;

  if not found then
    raise exception using errcode = 'P0001', message = 'WAITLIST_CONFIRMATION_NOT_FOUND';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.complete_waitlist_confirmation(text,uuid,text) from public;
grant execute on function public.complete_waitlist_confirmation(text,uuid,text) to anon, authenticated;

comment on column public.giveaway_waitlist.confirmation_attempted_at is
  'Último intento reservado para enviar la confirmación transaccional; permite reintentos controlados.';
comment on column public.giveaway_waitlist.confirmation_sent_at is
  'Momento en que SendWith aceptó la confirmación para entrega.';
