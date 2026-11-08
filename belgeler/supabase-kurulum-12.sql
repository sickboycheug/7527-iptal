-- =====================================================================
-- 7527iptal.org - Kurulum 12: dilekce numarasi prefikse gore artsin
--
-- ONCE : tek bir global sayac vardi
--          7527-CB-...-01   7527-CB-...-02   7527-MP-...-03   7527-CB-...-04
-- SONRA: her hedef turu kendi sayacini takip eder
--          7527-CB-...-01   7527-CB-...-02   7527-MP-...-01   7527-MP-...-02
--
-- MEVCUT KAYITLAR: her tur KENDI en yuksek numarasindan devam eder.
--   Turun adedinden baslatmak CAKISMA yaratirdi: CB'de 60 kayit var ama
--   numaralari 6..77 araliginda dagilmis durumda, 61'den baslatsaydik
--   zaten kullanilmis bir numara uretilebilir ve unique kisiti patlardi.
--
-- Tekrar calistirilabilir.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Her tur icin ayri sayac
-- ---------------------------------------------------------------------
create sequence if not exists public.petition_seq_cb;
create sequence if not exists public.petition_seq_mb;
create sequence if not exists public.petition_seq_mp;


-- ---------------------------------------------------------------------
-- 2) Sayaclari mevcut veriye gore konumlandir
--    Her turun numara alanindaki (4. parca) en buyuk degeri bulunur.
-- ---------------------------------------------------------------------
do $$
declare
  t    text;
  ust  bigint;
begin
  foreach t in array array['cb', 'mb', 'mp'] loop
    select coalesce(max(nullif(split_part(petition_number, '-', 4), '')::bigint), 0)
    into ust
    from public.campaign_submissions
    where recipient_type = t
      and petition_number ~ '^7527-(CB|MB|MP)-[0-9]{8}-[0-9]+$';

    if ust > 0 then
      perform setval('public.petition_seq_' || t, ust, true);
      raise notice '% -> siradaki numara %', t, ust + 1;
    else
      perform setval('public.petition_seq_' || t, 1, false);
      raise notice '% -> siradaki numara 1 (kayit yok)', t;
    end if;
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- 3) submit_petition: turune ait sayaci kullansin
-- ---------------------------------------------------------------------
create or replace function public.submit_petition(
  p_recipient_type text,
  p_recipient_id   integer,
  p_payload_enc    text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number text;
  v_id     bigint;
  v_no     bigint;
begin
  if p_recipient_type not in ('cb', 'mb', 'mp') then
    raise exception 'invalid_recipient';
  end if;

  if p_payload_enc is null
     or length(p_payload_enc) < 64
     or length(p_payload_enc) > 4000000
     or p_payload_enc not like '{"v":1%' then
    raise exception 'invalid_payload';
  end if;

  perform public.check_rate_limit('petition', 15);

  -- p_recipient_type yukarida dogrulandi, dinamik ad guvenli
  execute 'select nextval(''public.petition_seq_' || p_recipient_type || ''')'
  into v_no;

  v_number := '7527-' || upper(p_recipient_type) || '-' ||
              to_char(now() at time zone 'Europe/Istanbul', 'YYYYMMDD') || '-' ||
              lpad(v_no::text, 16, '0');

  insert into public.campaign_submissions
    (recipient_type, recipient_id, petition_number, payload_enc)
  values
    (p_recipient_type, p_recipient_id, v_number, p_payload_enc)
  returning id into v_id;

  if to_regclass('public.campaign_submission_audit') is not null then
    insert into public.campaign_submission_audit (submission_id, action)
    values (v_id, 'created');
  end if;

  return v_number;
end;
$$;

revoke all on function public.submit_petition(text, integer, text) from public;
grant execute on function public.submit_petition(text, integer, text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 4) Temizlik fonksiyonu uc sayaci da sifirlasin
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
  delete from public.campaign_submissions where id is not null;

  perform setval('public.petition_seq_cb', 1, false);
  perform setval('public.petition_seq_mb', 1, false);
  perform setval('public.petition_seq_mp', 1, false);

  return v_count;
end;
$$;

revoke all on function public.admin_delete_petitions(text) from public;
grant execute on function public.admin_delete_petitions(text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 5) Eski global sayac artik kullanilmiyor
-- ---------------------------------------------------------------------
drop sequence if exists public.petition_seq;


-- =====================================================================
-- DOGRULAMA  --  her turun siradaki numarasi
-- =====================================================================
select 'cb' as tur,
       (select count(*) from public.campaign_submissions where recipient_type = 'cb') as mevcut_kayit,
       last_value + (case when is_called then 1 else 0 end) as siradaki_numara
from public.petition_seq_cb
union all
select 'mb',
       (select count(*) from public.campaign_submissions where recipient_type = 'mb'),
       last_value + (case when is_called then 1 else 0 end)
from public.petition_seq_mb
union all
select 'mp',
       (select count(*) from public.campaign_submissions where recipient_type = 'mp'),
       last_value + (case when is_called then 1 else 0 end)
from public.petition_seq_mp;
-- Beklenen: cb -> 78, mb -> 76, mp -> 75
