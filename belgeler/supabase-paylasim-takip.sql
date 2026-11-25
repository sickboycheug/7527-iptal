-- 7527iptal.org · Paylaşım takibi (hangi paylaşım kaç ziyaret ve kaç dilekçe getirdi)
-- Mevcut tablolara ve fonksiyonlara DOKUNMAZ. Sadece yeni bir tablo ve 3 yeni fonksiyon ekler.
-- Bu tabloya ad, telefon, e-posta ya da IP yazılmaz.

create table if not exists public.kt_olay (
  id              bigserial primary key,
  olay            text not null check (olay in ('ziyaret', 'dilekce')),
  k               text not null,               -- paylaşım yeri: wa, tg, x, fb, tel, kop ...
  kaynak          text not null default '',    -- paylaşılan sayfanın yolu, ör. /p/onur-... ya da /cagri/paylas-cagri-de.html
  petition_number text,
  hedef           text,                        -- cb / mb / mp
  ulke            text,
  il              text,
  created_at      timestamptz not null default now()
);
-- Bir dilekçe yalnız bir kez sayılır
create unique index if not exists kt_olay_dilekce_tek on public.kt_olay (petition_number) where olay = 'dilekce';
create index if not exists kt_olay_k on public.kt_olay (k, kaynak);

-- Tabloya dışarıdan doğrudan okuma/yazma yok; yalnız aşağıdaki fonksiyonlarla
alter table public.kt_olay enable row level security;
revoke all on public.kt_olay from anon, authenticated;

-- 1) Kayıt: ziyaret ya da onaylı dilekçe
create or replace function public.kt_kaydet(
  p_olay text, p_k text, p_kaynak text default '', p_no text default null,
  p_hedef text default null, p_ulke text default null, p_il text default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare v jsonb;
begin
  if p_olay not in ('ziyaret', 'dilekce') then return; end if;
  if p_k is null or p_k !~ '^[a-z0-9-]{1,40}$' then return; end if;
  if p_kaynak is null or p_kaynak !~ '^/[A-Za-z0-9/_.%-]{0,160}$' then p_kaynak := ''; end if;
  if p_olay = 'dilekce' then
    if p_no is null or length(p_no) > 40 then return; end if;
    -- Sadece gerçekten onaylanmış dilekçe kaydedilir (mevcut petition_status fonksiyonu ile kontrol)
    select to_jsonb(t) into v from public.petition_status(p_no) t limit 1;
    if v ? 'petition_status' then v := v -> 'petition_status'; end if;
    if coalesce((v ->> 'confirmed')::boolean, false) is not true then return; end if;
    insert into public.kt_olay (olay, k, kaynak, petition_number, hedef, ulke, il)
    values ('dilekce', p_k, p_kaynak, p_no, left(p_hedef, 10), left(p_ulke, 60), left(p_il, 60))
    on conflict do nothing;
  else
    insert into public.kt_olay (olay, k, kaynak) values ('ziyaret', p_k, p_kaynak);
  end if;
end $$;
revoke all on function public.kt_kaydet(text, text, text, text, text, text, text) from public;
grant execute on function public.kt_kaydet(text, text, text, text, text, text, text) to anon, authenticated;

-- 2) Rapor (yalnız yönetici): her paylaşım için ziyaret, dilekçe, iller
create or replace function public.kt_rapor(p_pin text, p_gun integer default 0)
returns table(k text, kaynak text, ziyaret bigint, dilekce bigint, iller text, son timestamptz)
language plpgsql
security definer
set search_path to 'public'
as $$
#variable_conflict use_column
begin
  if not public.verify_access_pin('admin', p_pin) then raise exception 'forbidden'; end if;
  return query
  with o as (
    select * from public.kt_olay
     where coalesce(p_gun, 0) <= 0 or created_at >= now() - make_interval(days => p_gun)
  ), il as (
    select o.k, o.kaynak, string_agg(o.yer || ': ' || o.n, ', ' order by o.n desc, o.yer) as iller
      from (select k, kaynak, coalesce(nullif(il, ''), nullif(ulke, ''), 'bilinmiyor') as yer, count(*) as n
              from o where olay = 'dilekce' group by 1, 2, 3) o
     group by 1, 2
  )
  select o.k, o.kaynak,
         count(*) filter (where o.olay = 'ziyaret'),
         count(*) filter (where o.olay = 'dilekce'),
         coalesce(max(il.iller), ''),
         max(o.created_at)
    from o left join il on il.k = o.k and il.kaynak = o.kaynak
   group by o.k, o.kaynak
   order by 4 desc, 3 desc;
end $$;
revoke all on function public.kt_rapor(text, integer) from public;
grant execute on function public.kt_rapor(text, integer) to anon, authenticated;

-- 3) Silme (yalnız yönetici): bir paylaşımın kayıtlarını siler
create or replace function public.kt_sil(p_pin text, p_k text, p_kaynak text)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare n integer;
begin
  if not public.verify_access_pin('admin', p_pin) then raise exception 'forbidden'; end if;
  delete from public.kt_olay where k = p_k and kaynak = coalesce(p_kaynak, '');
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.kt_sil(text, text, text) from public;
grant execute on function public.kt_sil(text, text, text) to anon, authenticated;
