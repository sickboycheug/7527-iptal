-- =====================================================================
-- 7527iptal.org - Kurulum 9: vekil imza beyani sablonu
--
-- Vekil panelinde imzalanacak belge yoktu; vekil bos bir tuvale imza
-- atiyordu. Bu migration dorduncu bir sablon turu ekler: 'mp_sign'.
--
-- Metin, projenin ilk surumlerindeki 'vekil_katilma' belgesinden alindi
-- (commit e1d7102), sonradan silinmisti.
--
-- Tekrar calistirilabilir.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Sablon turune 'mp_sign' ekle
-- ---------------------------------------------------------------------
alter table public.petition_templates
  drop constraint if exists petition_templates_recipient_type_check;

alter table public.petition_templates
  add constraint petition_templates_recipient_type_check
  check (recipient_type in ('cb', 'mb', 'mp', 'mp_sign'));


-- ---------------------------------------------------------------------
-- 2) Vekil imza beyani metni
--    Yer tutucular: {VEKIL_AD} {VEKIL_PARTI} {VEKIL_SEHIR}
-- ---------------------------------------------------------------------
insert into public.petition_templates (recipient_type, header, konu, body) values
('mp_sign',
 'TÜRKİYE BÜYÜK MİLLET MECLİSİ BAŞKANLIĞINA',
 '7527 Sayılı Kanun Değişiklik Teklifine Katılma ve Sunma Beyanı Hk.',
 'Sivil toplum kuruluşları ve yurttaşlar tarafından hazırlanan 7527 Sayılı Kanunda Değişiklik Yapılmasına Dair Kanun Teklifi ve Genel Gerekçe metnini incelemiş bulunmaktayım.' || chr(10) || chr(10) ||
 'Anayasal yaşam hakkı ve toplumsal vicdan ilkesi gereğince söz konusu kanun teklifini TBMM Milletvekili sıfatımla imzalayarak TBMM Başkanlığına sunmayı kabul ve beyan ederim.')
on conflict (recipient_type) do nothing;


-- ---------------------------------------------------------------------
-- 3) Kaydetme fonksiyonu 'mp_sign' turunu de kabul etsin
-- ---------------------------------------------------------------------
create or replace function public.save_petition_template(
  p_pin    text,
  p_type   text,
  p_header text,
  p_konu   text,
  p_body   text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.verify_access_pin('admin', p_pin) then
    raise exception 'unauthorized';
  end if;

  if p_type not in ('cb', 'mb', 'mp', 'mp_sign') then
    raise exception 'invalid_type';
  end if;

  if length(btrim(coalesce(p_header, ''))) < 5  or length(p_header) > 500
     or length(btrim(coalesce(p_konu, '')))  < 10 or length(p_konu)  > 4000
     or length(btrim(coalesce(p_body, '')))  < 10 or length(p_body)  > 8000 then
    raise exception 'invalid_text';
  end if;

  insert into public.petition_templates (recipient_type, header, konu, body, updated_at)
  values (p_type, btrim(p_header), btrim(p_konu), btrim(p_body), now())
  on conflict (recipient_type) do update
    set header = excluded.header,
        konu = excluded.konu,
        body = excluded.body,
        updated_at = now();

  return true;
end;
$$;

revoke all on function public.save_petition_template(text, text, text, text, text) from public;
grant execute on function public.save_petition_template(text, text, text, text, text) to anon, authenticated;


-- =====================================================================
-- DOGRULAMA  --  4 satir donmeli, mp_sign dahil
-- =====================================================================
select recipient_type, left(header, 45) as baslik
from public.petition_templates
order by recipient_type;
