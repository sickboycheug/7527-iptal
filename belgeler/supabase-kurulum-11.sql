-- =====================================================================
-- 7527iptal.org - Kurulum 11: silme fonksiyonlari duzeltmesi
--
-- SORUN: PostgREST oturumunda sql_safe_updates acik oldugu icin
--        WHERE'siz DELETE reddediliyor:
--          21000: DELETE requires a WHERE clause
--
--        Ayni sorgular SQL Editor'de calisiyor (orada ayar kapali),
--        bu yuzden hata ancak RPC uzerinden cagirinca ortaya cikiyor.
--
-- COZUM: Her DELETE'e her zaman dogru olan bir WHERE kosulu ekleniyor.
--
-- Tekrar calistirilabilir.
-- =====================================================================

create or replace function public.admin_delete_mp_signatures(p_pin text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.verify_access_pin('admin', p_pin) then
    raise exception 'unauthorized';
  end if;

  select count(*)::integer into v_count from public.mp_signatures_enc;
  delete from public.mp_signatures_enc where mp_id is not null;
  return v_count;
end;
$$;

revoke all on function public.admin_delete_mp_signatures(text) from public;
grant execute on function public.admin_delete_mp_signatures(text) to anon, authenticated;


create or replace function public.admin_delete_petitions(p_pin text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.verify_access_pin('admin', p_pin) then
    raise exception 'unauthorized';
  end if;

  select count(*)::integer into v_count from public.campaign_submissions;
  delete from public.campaign_submissions where id is not null;
  alter sequence public.petition_seq restart with 1;
  return v_count;
end;
$$;

revoke all on function public.admin_delete_petitions(text) from public;
grant execute on function public.admin_delete_petitions(text) to anon, authenticated;


create or replace function public.admin_reset_rate_limit(p_pin text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.verify_access_pin('admin', p_pin) then
    raise exception 'unauthorized';
  end if;

  select count(*)::integer into v_count from public.submission_rate;
  delete from public.submission_rate where id is not null;
  return v_count;
end;
$$;

revoke all on function public.admin_reset_rate_limit(text) from public;
grant execute on function public.admin_reset_rate_limit(text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- Ayni sorun hiz siniri temizliginde de vardi: check_rate_limit icindeki
-- "eski kayitlari sil" adimi WHERE tasiyordu, bu yuzden etkilenmedi.
-- Yine de dogrulamak icin burada birakiyoruz.
-- ---------------------------------------------------------------------


-- =====================================================================
-- DOGRULAMA  --  fonksiyon govdelerinde WHERE var mi
-- =====================================================================
select p.proname as fonksiyon,
       case when pg_get_functiondef(p.oid) like '%delete from%where%'
            then 'WHERE var - duzeltildi'
            else '*** WHERE YOK' end as durum
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('admin_delete_mp_signatures',
                    'admin_delete_petitions',
                    'admin_reset_rate_limit')
order by p.proname;
-- Beklenen: 3 satir, hepsi "WHERE var - duzeltildi"
