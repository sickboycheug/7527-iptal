-- 7527 İPTAL · Paylaşım önizleme görselleri (vaka, Onur Köşesi, Sahadan Paylaş)
-- Her içerik paylaşılırken kendi görseli bir kez saklanır; Cloudflare Worker bunu önizleme olarak verir.
-- Yalnızca YENİ tablo ve fonksiyon ekler. Supabase > SQL Editor > New query > tamamını yapıştır > Run.

create table if not exists public.gv_og (
  key        text primary key,
  img        text not null,
  created_at timestamptz not null default now()
);
alter table public.gv_og enable row level security;

create or replace function public.gv_og_has(p_key text) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.gv_og where key = p_key);
$$;

create or replace function public.gv_og_get(p_key text) returns text
language sql stable security definer set search_path to 'public' as $$
  select img from public.gv_og where key = p_key;
$$;

-- İlk yazan kalır: aynı anahtara ikinci görsel yazılmaz (içerik değişince anahtar zaten değişir)
create or replace function public.gv_og_put(p_key text, p_img text) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if p_key !~ '^(vaka|onur|saha)-[a-z0-9-]{1,80}-[0-9a-f]{8}$' then raise exception 'invalid_input'; end if;
  if p_img is null or length(p_img) > 420000 or p_img !~ '^data:image/jpeg;base64,' then raise exception 'invalid_image'; end if;
  if exists (select 1 from public.gv_og where key = p_key) then return; end if;
  perform public.check_rate_limit('gv_og_put', 60);
  insert into public.gv_og (key, img) values (p_key, p_img) on conflict (key) do nothing;
end $$;

-- Yönetici: görselleri silip yeniden üretilmesini sağlar (örn. 'onur-' ile hepsi, ya da tek anahtar)
create or replace function public.gv_admin_og_delete(p_pin text, p_prefix text) returns integer
language plpgsql security definer set search_path to 'public' as $$
declare n integer;
begin
  if not public.verify_access_pin('admin', p_pin) then raise exception 'unauthorized'; end if;
  delete from public.gv_og where key like coalesce(p_prefix, '') || '%';
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function public.gv_og_has(text) to anon, authenticated;
grant execute on function public.gv_og_get(text) to anon, authenticated;
grant execute on function public.gv_og_put(text, text) to anon, authenticated;
grant execute on function public.gv_admin_og_delete(text, text) to anon, authenticated;
