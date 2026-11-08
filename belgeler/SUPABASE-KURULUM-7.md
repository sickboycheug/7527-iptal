# Supabase Kurulum — 7. Aşama: dilekçe onayı

Sayaçlar artık **"Evet, gönderdim"** denildiğinde artacak.

Akış iki adımlı:

1. **Gönder** → dilekçe kaydedilir (`confirmed = false`), numara üretilir, PDF indirilir, mail açılır
2. **Evet, gönderdim** → `confirm_petition()` çağrılır, `confirmed = true` olur, **sayaç artar**

Sayaçlar yalnızca `confirmed = true` kayıtları sayar. Böylece mail programını açıp vazgeçen
kullanıcılar sayacı şişirmez, ama dilekçe numarası yine de üretilmiş olur.

**Nereye:** `https://supabase.com/dashboard/project/mednnlpprdgupdajmrin/sql/new`

---

## Beklenen sonuç

| citizen_total | cb_total | mb_total | mp_total | mp_signed | volunteers |
|---|---|---|---|---|---|
| `0` | `0` | `0` | `0` | `0` | `0` |

---

```sql
-- =====================================================================
-- 7527iptal.org - Dilekce onay adimi
-- Tekrar calistirilabilir.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Onay sutunu
-- ---------------------------------------------------------------------
alter table public.campaign_submissions
  add column if not exists confirmed boolean not null default false;

alter table public.campaign_submissions
  add column if not exists confirmed_at timestamptz;

create index if not exists campaign_submissions_confirmed_idx
  on public.campaign_submissions (confirmed, recipient_type);


-- ---------------------------------------------------------------------
-- 2) Onaylama fonksiyonu
--    Kullanici "Evet, gonderdim" dediginde cagrilir.
--    Donus: true (onaylandi) / false (numara bulunamadi)
-- ---------------------------------------------------------------------
create or replace function public.confirm_petition(p_petition_number text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  if p_petition_number is null
     or p_petition_number !~ '^7527-(CB|MB|MP)-[0-9]{8}-[0-9]+$' then
    raise exception 'invalid_number';
  end if;

  update public.campaign_submissions
  set confirmed = true,
      confirmed_at = coalesce(confirmed_at, now())
  where petition_number = p_petition_number
  returning id into v_id;

  if v_id is null then
    return false;
  end if;

  if to_regclass('public.campaign_submission_audit') is not null then
    insert into public.campaign_submission_audit (submission_id, action)
    values (v_id, 'confirmed');
  end if;

  return true;
end;
$$;

revoke all on function public.confirm_petition(text) from public;
grant execute on function public.confirm_petition(text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 3) Sayaclar yalnizca ONAYLANMIS dilekceleri saysin
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
    (select count(*)::integer from public.campaign_submissions where confirmed),
    (select count(*)::integer from public.campaign_submissions where confirmed and recipient_type = 'cb'),
    (select count(*)::integer from public.campaign_submissions where confirmed and recipient_type = 'mb'),
    (select count(*)::integer from public.campaign_submissions where confirmed and recipient_type = 'mp'),
    (select count(*)::integer from public.mp_signatures_enc),
    (select count(*)::integer from public.campaign_volunteers);
$$;

revoke all on function public.campaign_counts() from public;
grant execute on function public.campaign_counts() to anon, authenticated;


-- ---------------------------------------------------------------------
-- 4) Disa aktarima onay bilgisini ekle
-- ---------------------------------------------------------------------
drop function if exists public.export_petitions(text);

create function public.export_petitions(p_pin text)
returns table (
  petition_number text,
  recipient_type  text,
  recipient_id    text,
  confirmed       boolean,
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
  select s.petition_number,
         s.recipient_type,
         s.recipient_id::text,
         s.confirmed,
         s.payload_enc,
         s.created_at
  from public.campaign_submissions s
  order by s.created_at desc;
end;
$$;

revoke all on function public.export_petitions(text) from public;
grant execute on function public.export_petitions(text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 5) Onaylanmamis eski kayitlari temizle (test artiklari)
-- ---------------------------------------------------------------------
delete from public.campaign_submissions where confirmed = false;
alter sequence public.petition_seq restart with 1;


-- =====================================================================
-- DOGRULAMA  --  hepsi 0 olmali
-- =====================================================================
select * from public.campaign_counts();
```
