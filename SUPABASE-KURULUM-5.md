# Supabase Kurulum — 5. Aşama: tek düzeltme + test verisi temizliği

4. aşama testinde tek bir hata çıktı:

```
export_petitions → 42804
Returned type text does not match expected type integer in column 3
```

`campaign_submissions.recipient_id` sütunu canlıda **`text`** tipinde, ama `export_petitions`
onu `integer` olarak ilan ediyordu. Repodaki eski migration `integer` diyor, canlı şema farklı.

Aşağıdaki script tip uyumsuzluğunu giderir ve benim test sırasında oluşturduğum kayıtları siler.

**Nereye:** `https://supabase.com/dashboard/project/mednnlpprdgupdajmrin/sql/new`

---

## Beklenen sonuç

Son tabloda hepsi `0`:

| citizen_total | cb_total | mb_total | mp_total | mp_signed | volunteers |
|---|---|---|---|---|---|
| `0` | `0` | `0` | `0` | `0` | `0` |

---

```sql
-- =====================================================================
-- 1) export_petitions: recipient_id tipini canlı şemaya uyarla
--    (::text cast ile tipten bagimsiz hale getiriyoruz)
-- =====================================================================
drop function if exists public.export_petitions(text);

create function public.export_petitions(p_pin text)
returns table (
  petition_number text,
  recipient_type  text,
  recipient_id    text,
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
         s.payload_enc,
         s.created_at
  from public.campaign_submissions s
  order by s.created_at desc;
end;
$$;

revoke all on function public.export_petitions(text) from public;
grant execute on function public.export_petitions(text) to anon, authenticated;


-- =====================================================================
-- 2) Test kayitlarini sil
--    (dogrulama sirasinda olusturulan sahte veriler)
-- =====================================================================
delete from public.campaign_submissions;
delete from public.mp_signatures_enc where mp_id = 999;
delete from public.campaign_volunteers;

-- Dilekce numarasi sayacini bastan baslat
alter sequence public.petition_seq restart with 1;


-- =====================================================================
-- DOGRULAMA  --  hepsi 0 olmali
-- =====================================================================
select * from public.campaign_counts();
```
