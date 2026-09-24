# Supabase Kurulum — 4. Aşama: Uçtan uca şifreleme + dilekçe numarası

Bu aşamadan sonra **hiçbir kişisel veri Supabase'e düz metin gitmez.** Tarayıcı, veriyi
kampanya açık anahtarıyla şifreleyip gönderir; çözmek yalnızca özel anahtar + parola ile
(sizin tarayıcınızda) mümkündür.

**Nereye:** `https://supabase.com/dashboard/project/mednnlpprdgupdajmrin/sql/new`

---

## Ne yapıyor

| # | İş |
|---|---|
| 1 | `campaign_submissions` / `campaign_citizens` tablolarını anon'a kapatır (şu an **açık**) |
| 2 | Dilekçe numarası için `sequence` kurar — numara artık sunucuda, atomik üretilir |
| 3 | Dilekçe ve vekil imzası tablolarına şifreli yük (`payload_enc`) sütunu ekler |
| 4 | `submit_petition()` — numara döndürür, çakışma imkânsız |
| 5 | `submit_mp_signature_enc()` — vekil imzası, şifreli |
| 6 | Sayaç RPC'leri — kişisel veri sızdırmadan sayı verir |
| 7 | Yönetici dışa aktarım RPC'leri — admin PIN'i ile, şifreli veriyi döndürür |

---

## Önemli tasarım kararı: mükerrer kontrolü kaldırıldı

Daha önce `citizen_hash` (TC'nin SHA-256'sı) ile mükerrer dilekçe engelleniyordu.
Uçtan uca şifrelemede bu **mümkün değil** — sunucu TC'yi hiç görmediği için karşılaştıramaz.

Sunucuda karşılaştırabilmek için TC'nin düz ya da hash'li gönderilmesi gerekirdi; ikisi de
E2E sözünü bozar (ve 11 haneli TC'nin hash'i brute-force ile kırılabilir — bunu daha önce
konuşmuştuk). Bu yüzden:

- Dilekçe mükerrerliği **engellenmiyor**. Bir kampanya için bu sorun değil: aynı kişinin
  iki kez dilekçe göndermesi sahtecilik değil, hedef zaten imza sayısını artırmak.
- Vekil imzasında mükerrer **engelleniyor** — `mp_id` şifrelenmiyor (zaten kamuya açık bilgi),
  o yüzden tekillik korunabiliyor.
- Gönüllü listesinde mükerrer **engellenmiyor**; dışa aktarımdan sonra Excel'de ayıklanır.

---

## Beklenen sonuç

Son doğrulama tablosunda hepsi `false` olmalı:

| submissions_okunabilir | citizens_okunabilir | mp_sig_okunabilir | volunteers_okunabilir |
|---|---|---|---|
| `false` | `false` | `false` | `false` |

---

## SQL Script

```sql
-- =====================================================================
-- 7527iptal.org - Kurulum 4: uctan uca sifreleme + dilekce numarasi
-- Tekrar calistirilabilir.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Acik kalan tablolari kapat
-- ---------------------------------------------------------------------
drop policy if exists "public citizen insert"    on public.campaign_citizens;
drop policy if exists "public submission insert" on public.campaign_submissions;

revoke all on public.campaign_citizens   from anon, authenticated;
revoke all on public.campaign_submissions from anon, authenticated;


-- ---------------------------------------------------------------------
-- 2) Dilekce numarasi sirasi
--    Numara SUNUCUDA uretilir -> ayni anda gonderilse bile cakisma olmaz.
-- ---------------------------------------------------------------------
create sequence if not exists public.petition_seq;


-- ---------------------------------------------------------------------
-- 3) Sifreli yuk sutunlari
--    payload_enc: tarayicida RSA-OAEP-4096 + AES-256-GCM ile sifrelenmis
--    JSON zarf. Sunucu icerigini goremez.
-- ---------------------------------------------------------------------
alter table public.campaign_submissions
  add column if not exists payload_enc text;

-- citizen_hash artik kullanilmiyor (bkz. yukaridaki tasarim notu)
alter table public.campaign_submissions
  alter column citizen_hash drop not null;

alter table public.campaign_submissions
  drop constraint if exists campaign_submissions_citizen_hash_fkey;


-- Vekil imzalari (sifreli) -------------------------------------------
--   mp_id ve signed_at ACIK kalir: kimin imzaladigi zaten kamuya ilan
--   ediliyor ve sayaclar icin gerekli. Ad/e-posta/imza gorseli sifreli.
create table if not exists public.mp_signatures_enc (
  mp_id       integer primary key,
  payload_enc text not null,
  verified    boolean not null default false,
  signed_at   timestamptz not null default now()
);

alter table public.mp_signatures_enc enable row level security;
revoke all on public.mp_signatures_enc from anon, authenticated;


-- Gonullu tablosuna sifreli sutun ------------------------------------
alter table public.campaign_volunteers
  add column if not exists payload_enc text;

alter table public.campaign_volunteers alter column name    drop not null;
alter table public.campaign_volunteers alter column contact drop not null;

-- Sifreli iletisim bilgisi karsilastirilamaz -> tekillik indeksi kalkiyor
drop index if exists public.campaign_volunteers_contact_uniq;


-- ---------------------------------------------------------------------
-- 4) Dilekce gonderimi
--    Donus: uretilen dilekce numarasi
-- ---------------------------------------------------------------------
drop function if exists public.record_campaign_submission(text, text, integer, text);

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
begin
  if p_recipient_type not in ('cb', 'mb', 'mp') then
    raise exception 'invalid_recipient';
  end if;

  -- Sifreli zarf bicim kontrolu (icerigi okumadan)
  if p_payload_enc is null
     or length(p_payload_enc) < 64
     or length(p_payload_enc) > 4000000
     or p_payload_enc not like '{"v":1%' then
    raise exception 'invalid_payload';
  end if;

  v_number := '7527-' || upper(p_recipient_type) || '-' ||
              to_char(now() at time zone 'Europe/Istanbul', 'YYYYMMDD') || '-' ||
              lpad(nextval('public.petition_seq')::text, 16, '0');

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
-- 5) Vekil imzasi (sifreli)
--    Donus: 'created' | 'duplicate'
-- ---------------------------------------------------------------------
create or replace function public.submit_mp_signature_enc(
  p_mp_id       integer,
  p_payload_enc text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id integer;
begin
  if p_mp_id is null or p_mp_id < 1 or p_mp_id > 1000 then
    raise exception 'invalid_mp';
  end if;

  if p_payload_enc is null
     or length(p_payload_enc) < 64
     or length(p_payload_enc) > 4000000
     or p_payload_enc not like '{"v":1%' then
    raise exception 'invalid_payload';
  end if;

  insert into public.mp_signatures_enc (mp_id, payload_enc)
  values (p_mp_id, p_payload_enc)
  on conflict (mp_id) do nothing
  returning mp_id into v_id;

  if v_id is null then
    return 'duplicate';
  end if;

  return 'created';
end;
$$;

revoke all on function public.submit_mp_signature_enc(integer, text) from public;
grant execute on function public.submit_mp_signature_enc(integer, text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 6) Gonullu kaydi (sifreli)
-- ---------------------------------------------------------------------
create or replace function public.add_volunteer_enc(
  p_city        text,
  p_payload_enc text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_city text := nullif(btrim(coalesce(p_city, '')), '');
begin
  if v_city is not null and length(v_city) > 60 then
    raise exception 'invalid_city';
  end if;

  if p_payload_enc is null
     or length(p_payload_enc) < 64
     or length(p_payload_enc) > 1000000
     or p_payload_enc not like '{"v":1%' then
    raise exception 'invalid_payload';
  end if;

  insert into public.campaign_volunteers (city, payload_enc)
  values (v_city, p_payload_enc);

  return 'created';
end;
$$;

revoke all on function public.add_volunteer_enc(text, text) from public;
grant execute on function public.add_volunteer_enc(text, text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 7) Sayaclar  --  kisisel veri sizdirmaz, yalnizca sayi doner
-- ---------------------------------------------------------------------
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


-- Imzalayan vekiller vitrini: yalnizca mp_id + tarih (kamuya acik bilgi)
create or replace function public.list_signed_mps()
returns table (mp_id integer, signed_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select s.mp_id, s.signed_at
  from public.mp_signatures_enc s
  order by s.signed_at;
$$;

revoke all on function public.list_signed_mps() from public;
grant execute on function public.list_signed_mps() to anon, authenticated;


-- ---------------------------------------------------------------------
-- 8) Yonetici disa aktarimi  --  admin PIN'i ile, SIFRELI veri doner
--    Cozme islemi yoneticinin tarayicisinda yapilir.
-- ---------------------------------------------------------------------
create or replace function public.export_petitions(p_pin text)
returns table (
  petition_number text,
  recipient_type  text,
  recipient_id    integer,
  payload_enc     text,
  created_at      timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.verify_access_pin('admin', p_pin) then
    raise exception 'unauthorized';
  end if;

  return query
  select s.petition_number, s.recipient_type, s.recipient_id, s.payload_enc, s.created_at
  from public.campaign_submissions s
  order by s.created_at desc;
end;
$$;

revoke all on function public.export_petitions(text) from public;
grant execute on function public.export_petitions(text) to anon, authenticated;


create or replace function public.export_mp_signatures(p_pin text)
returns table (
  mp_id       integer,
  payload_enc text,
  verified    boolean,
  signed_at   timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.verify_access_pin('admin', p_pin) then
    raise exception 'unauthorized';
  end if;

  return query
  select s.mp_id, s.payload_enc, s.verified, s.signed_at
  from public.mp_signatures_enc s
  order by s.signed_at desc;
end;
$$;

revoke all on function public.export_mp_signatures(text) from public;
grant execute on function public.export_mp_signatures(text) to anon, authenticated;


-- Gonullu disa aktarimi: sifreli surume gecis
drop function if exists public.export_volunteers(text);

create or replace function public.export_volunteers(p_pin text)
returns table (
  id          bigint,
  city        text,
  payload_enc text,
  created_at  timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.verify_access_pin('admin', p_pin) then
    raise exception 'unauthorized';
  end if;

  return query
  select v.id, v.city, v.payload_enc, v.created_at
  from public.campaign_volunteers v
  order by v.created_at desc;
end;
$$;

revoke all on function public.export_volunteers(text) from public;
grant execute on function public.export_volunteers(text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 9) Eski test kayitlarini temizle (sifresiz donemden kalma)
-- ---------------------------------------------------------------------
delete from public.campaign_submissions where payload_enc is null;
delete from public.campaign_citizens;


-- ---------------------------------------------------------------------
-- 10) Tablolar olusturulduktan sonra yetkileri tekrar geri al
-- ---------------------------------------------------------------------
revoke all on public.campaign_citizens    from anon, authenticated;
revoke all on public.campaign_submissions from anon, authenticated;
revoke all on public.mp_signatures_enc    from anon, authenticated;
revoke all on public.campaign_volunteers  from anon, authenticated;


-- =====================================================================
-- DOGRULAMA  --  hepsi false olmali
-- =====================================================================
select has_table_privilege('anon', 'public.campaign_submissions', 'SELECT') as submissions_okunabilir,
       has_table_privilege('anon', 'public.campaign_citizens',    'SELECT') as citizens_okunabilir,
       has_table_privilege('anon', 'public.mp_signatures_enc',    'SELECT') as mp_sig_okunabilir,
       has_table_privilege('anon', 'public.campaign_volunteers',  'SELECT') as volunteers_okunabilir;

select * from public.campaign_counts();
-- Beklenen: hepsi 0
```
