-- =====================================================================
-- 7527iptal.org - Kurulum 10: yonetici veri temizligi
--
-- Imzalari ve dilekceleri yonetici panelinden silebilmek icin.
-- Her islem admin PIN'i ile dogrulanir ve silinen satir sayisini doner.
--
-- Tekrar calistirilabilir.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Vekil imzalarini sil
-- ---------------------------------------------------------------------
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
  delete from public.mp_signatures_enc;
  return v_count;
end;
$$;

revoke all on function public.admin_delete_mp_signatures(text) from public;
grant execute on function public.admin_delete_mp_signatures(text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 2) Vatandas dilekcelerini sil + numarayi bastan baslat
-- ---------------------------------------------------------------------
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
  delete from public.campaign_submissions;
  alter sequence public.petition_seq restart with 1;
  return v_count;
end;
$$;

revoke all on function public.admin_delete_petitions(text) from public;
grant execute on function public.admin_delete_petitions(text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 3) IP hiz siniri kayitlarini sifirla
--    Test sirasinda kendi IP'sini sinira taktiran yonetici icin.
--    Kisisel veri silmez, yalnizca sayaci bosaltir.
-- ---------------------------------------------------------------------
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
  delete from public.submission_rate;
  return v_count;
end;
$$;

revoke all on function public.admin_reset_rate_limit(text) from public;
grant execute on function public.admin_reset_rate_limit(text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 4) Tek bir gonullu kaydini sil
--    KVKK m.11 silme talebi geldiginde gerekli.
--    Kimin hangi kayit oldugunu gormek icin once Excel'e aktarip
--    id'yi oradan bulun.
-- ---------------------------------------------------------------------
create or replace function public.admin_delete_volunteer(p_pin text, p_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  if not public.verify_access_pin('admin', p_pin) then
    raise exception 'unauthorized';
  end if;

  delete from public.campaign_volunteers where id = p_id returning id into v_id;
  return v_id is not null;
end;
$$;

revoke all on function public.admin_delete_volunteer(text, bigint) from public;
grant execute on function public.admin_delete_volunteer(text, bigint) to anon, authenticated;


-- =====================================================================
-- DOGRULAMA  --  fonksiyonlar kuruldu mu
-- =====================================================================
select p.proname as fonksiyon
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('admin_delete_mp_signatures', 'admin_delete_petitions',
                    'admin_reset_rate_limit', 'admin_delete_volunteer')
order by p.proname;
-- Beklenen: 4 satir
