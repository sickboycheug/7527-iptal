-- Run this migration in the Supabase SQL editor.
-- Populate verified_mps only with independently confirmed official addresses.

create table if not exists public.verified_mps (
  mp_id integer primary key,
  official_email text not null unique,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'revoked')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mp_signatures (
  mp_id integer primary key references public.verified_mps(mp_id),
  signature_data text not null,
  signed_at timestamptz not null default now(),
  signed_by uuid not null references auth.users(id)
);

alter table public.verified_mps enable row level security;
alter table public.mp_signatures enable row level security;

revoke all on public.verified_mps from anon, authenticated;
revoke all on public.mp_signatures from anon, authenticated;

drop policy if exists "verified mp can read own record" on public.verified_mps;
create policy "verified mp can read own record"
on public.verified_mps for select to authenticated
using (auth.uid() = auth_user_id and status = 'verified');

create or replace function public.claim_verified_mp(p_mp_id integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_id integer;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select mp_id into matched_id
  from public.verified_mps
  where mp_id = p_mp_id
    and status <> 'revoked'
    and lower(official_email) = lower(coalesce(auth.jwt() ->> 'email', ''));

  if matched_id is null then
    return false;
  end if;

  update public.verified_mps
  set auth_user_id = auth.uid(), status = 'verified', verified_at = now(), updated_at = now()
  where mp_id = p_mp_id;

  return true;
end;
$$;

create or replace function public.submit_mp_signature(p_mp_id integer, p_signature_data text)
returns table (mp_id integer, signed_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  if not exists (
    select 1 from public.verified_mps
    where verified_mps.mp_id = p_mp_id
      and verified_mps.auth_user_id = auth.uid()
      and verified_mps.status = 'verified'
  ) then
    raise exception 'mp_not_verified';
  end if;

  return query
  insert into public.mp_signatures (mp_id, signature_data, signed_by)
  values (p_mp_id, p_signature_data, auth.uid())
  returning mp_signatures.mp_id, mp_signatures.signed_at;
end;
$$;

create or replace function public.list_mp_signatures()
returns table (mp_id integer, signed_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select s.mp_id, s.signed_at
  from public.mp_signatures s
  order by s.signed_at;
$$;

revoke all on function public.claim_verified_mp(integer) from public;
revoke all on function public.submit_mp_signature(integer, text) from public;
revoke all on function public.list_mp_signatures() from public;
grant execute on function public.claim_verified_mp(integer) to authenticated;
grant execute on function public.submit_mp_signature(integer, text) to authenticated;
grant execute on function public.list_mp_signatures() to anon, authenticated;

-- Example administrator seed after independently confirming the address:
-- insert into public.verified_mps (mp_id, official_email)
-- values (123, 'confirmed.address@tbmm.gov.tr');
