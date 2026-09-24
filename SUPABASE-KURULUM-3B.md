# Kurulum 3 — kalan kısım

1. adımı (SELECT) çalıştırdınız, iki overload olduğu doğrulandı:

```
record_campaign_submission(text,text,bigint,text)
record_campaign_submission(text,text,integer,text)
```

Şimdi aşağıdakini **tamamını** SQL Editor'e yapıştırıp **Run** deyin.
Editördeki eski sorguyu silip bunu yapıştırın.

---

## Beklenen sonuç

Son tabloda:

| kalan_tanim_sayisi | imza |
|---|---|
| `1` | `record_campaign_submission(text,text,integer,text)` |

Ayrıca `kalan_gonullu` = `0` olmalı (test kaydı silinmiş olur).

---

```sql
-- 1) TUM overload'lari dinamik olarak sil
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


-- 2) Tek dogru surumu kur (recipient_id integer)
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


-- 3) PostgREST sema onbellegini tazele
notify pgrst, 'reload schema';


-- 4) Test gonullu kaydini sil
delete from public.campaign_volunteers
where contact = 'test-claude@example.com';


-- =====================================================================
-- DOGRULAMA
-- =====================================================================
select count(*)                                     as kalan_tanim_sayisi,
       string_agg(p.oid::regprocedure::text, ' | ') as imza
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'record_campaign_submission';
-- Beklenen: 1 | record_campaign_submission(text,text,integer,text)

select public.volunteer_count() as kalan_gonullu;
-- Beklenen: 0
```
