-- =====================================================================
-- 7527iptal.org - Kurulum 13: sayac tum dilekceleri saysin
--
-- ONCE : sayac yalnizca confirmed = true satirlari sayiyordu.
--        Site 61 gosterirken Excel'de 78 satir vardi; aradaki 17 kisi
--        dilekceyi olusturup PDF'ini indirmis ama "Evet, gonderdim"
--        adimini isaretlememisti.
--
-- SONRA: dilekceyi olusturan herkes imzaci sayilir. Yapida dogrulama
--        yok ve katilim gonulluluk esasina dayaniyor; "E-posta ile
--        dilekceyi gonder" dugmesine basmak imza kabul edilir.
--
-- NOT  : confirmed alani SILINMIYOR. Kim ayrica "Evet, gonderdim"
--        dedi bilgisi duruyor ve Excel'de "Gonderim Onayi" sutununda
--        gorunuyor; isaretlemeyenlere sonradan ulasilabilsin diye.
--        Yalnizca sayacin neyi saydigi degisiyor.
--
-- Tekrar calistirilabilir.
-- =====================================================================

create or replace function public.campaign_counts()
returns table (
  citizen_total integer,
  cb_total      integer,
  mb_total      integer,
  mp_total      integer,
  mp_signed     integer,
  volunteers    integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    (select count(*)::integer from public.campaign_submissions),
    (select count(*)::integer from public.campaign_submissions where recipient_type = 'cb'),
    (select count(*)::integer from public.campaign_submissions where recipient_type = 'mb'),
    (select count(*)::integer from public.campaign_submissions where recipient_type = 'mp'),
    (select count(*)::integer from public.mp_signatures_enc),
    (select count(*)::integer from public.campaign_volunteers);
$$;

revoke all on function public.campaign_counts() from public;
grant execute on function public.campaign_counts() to anon, authenticated;


-- =====================================================================
-- DOGRULAMA  --  sayac artik satir sayisiyla ayni olmali
-- =====================================================================
select (select count(*) from public.campaign_submissions)                  as excel_satir,
       (select citizen_total from public.campaign_counts())                as sitedeki_sayac,
       (select count(*) from public.campaign_submissions where confirmed)  as ayrica_onaylayan,
       (select count(*) from public.campaign_submissions where not confirmed) as onaylamayan;
-- Beklenen: excel_satir = sitedeki_sayac
