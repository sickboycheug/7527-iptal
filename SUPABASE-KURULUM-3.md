# Supabase Kurulum — 3. Aşama (tek düzeltme)

2. aşamadaki `drop function ... (text, text, bigint, text)` satırı tutmadı; `record_campaign_submission`
hâlâ **iki** tanımlı ve PostgREST hangisini çağıracağını seçemiyor (`PGRST203`).

Bu script hedefli silme yerine **tüm overload'ları dinamik olarak bulup siler**, sonra tek doğru
sürümü kurar. Tekrar çalıştırılabilir.

**Nereye:** `https://supabase.com/dashboard/project/mednnlpprdgupdajmrin/sql/new`

> Not: Bu fonksiyon şu an `index.html` tarafından çağrılmıyor (dilekçe sayaçları henüz bağlı değil).
> Yani acil değil — ama sayaçları bağladığımızda bu hata yolumuzu keserdi.

---

## Beklenen sonuç

Script üç sonuç bloğu üretir. Sonuncusu şöyle olmalı:

| kalan_tanim_sayisi | imza |
|---|---|
| `1` | `record_campaign_submission(text,text,integer,text)` |

---

## SQL Script

```sql
-- =====================================================================
-- record_campaign_submission overload temizligi
-- =====================================================================

-- 1) Once mevcut tanimlari gorelim (silmeden once kayit icin)
select p.oid::regprocedure::text as mevcut_tanimlar
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'record_campaign_submission';


-- 2) TUM overload'lari dinamik olarak sil
--    (hedefli drop tutmadigi icin oid uzerinden gidiyoruz)
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure::text as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'record_campaign_submission'
  loop
    raise notice 'siliniyor: %', r.sig;
    execute 'drop function ' || r.sig || ' cascade';
  end loop;
end $$;


-- 3) Tek dogru surumu kur (recipient_id integer)
create function public.record_campaign_submission(
  p_citizen_hash    text,
  p_recipient_type  text,
  p_recipient_id    integer,
  p_petition_number text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  submission_id bigint;
begin
  if p_citizen_hash !~ '^[0-9a-f]{64}$'
     or p_recipient_type not in ('cb', 'mb', 'mp')
     or p_petition_number !~ '^7527-(CB|MB|MP)-[0-9]{8}-[0-9A-F]+$' then
    raise exception 'invalid_submission';
  end if;

  insert into public.campaign_citizens (citizen_hash)
  values (p_citizen_hash)
  on conflict (citizen_hash) do nothing;

  insert into public.campaign_submissions
    (citizen_hash, recipient_type, recipient_id, petition_number)
  values
    (p_citizen_hash, p_recipient_type, p_recipient_id, p_petition_number)
  on conflict (petition_number) do nothing
  returning id into submission_id;

  if submission_id is not null
     and to_regclass('public.campaign_submission_audit') is not null then
    insert into public.campaign_submission_audit (submission_id, action)
    values (submission_id, 'created');
  end if;

  return submission_id;
end;
$$;

revoke all on function public.record_campaign_submission(text, text, integer, text) from public;
grant execute on function public.record_campaign_submission(text, text, integer, text) to anon, authenticated;


-- 4) PostgREST sema onbellegini tazele
notify pgrst, 'reload schema';


-- =====================================================================
-- DOGRULAMA  --  kalan_tanim_sayisi = 1 olmali
-- =====================================================================
select count(*)                                as kalan_tanim_sayisi,
       string_agg(p.oid::regprocedure::text, ' | ') as imza
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'record_campaign_submission';
```

---

## Bonus: test gönüllü kaydını sil

Doğrulama sırasında bir test kaydı oluşturdum. Canlıya çıkmadan önce temizleyin:

```sql
delete from public.campaign_volunteers
where contact = 'test-claude@example.com';

select public.volunteer_count() as kalan_gonullu;
-- Beklenen: 0
```
