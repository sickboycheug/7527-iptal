-- 7527 İPTAL · Supabase köprüsü (adım 1/2)
-- Site verileri 7527iptal.org/sb/ üzerinden gelince Supabase herkesi Cloudflare'in tek adresinden geliyor sanar.
-- Bu dosya, köprünün gizli anahtarla bildirdiği gerçek ziyaretçi adresini kullanır; böylece hız sınırları kişi başına kalır.
-- Anahtar yoksa ya da yanlışsa eski davranış aynen sürer. Başka hiçbir şeye dokunmaz.
delete from public.app_secrets where name = 'kopru_anahtar';
insert into public.app_secrets (name, value) values ('kopru_anahtar', 'e2fdedf9964a8d849c5039dda56e9f8f26915285cea470d5');

create or replace function public.client_ip()
returns text language plpgsql stable security definer set search_path = public as $$
declare hdrs json; ip text; k text;
begin
  begin hdrs := current_setting('request.headers', true)::json;
  exception when others then return null; end;
  if hdrs is null then return null; end if;

  k := hdrs ->> 'x-kopru-anahtar';
  if k is not null and k = (select value from public.app_secrets where name = 'kopru_anahtar') then
    ip := nullif(btrim(coalesce(hdrs ->> 'x-kopru-ip', '')), '');
    if ip is not null then return ip; end if;
  end if;

  ip := nullif(btrim(coalesce(hdrs ->> 'cf-connecting-ip', '')), '');
  if ip is null then ip := nullif(btrim(split_part(coalesce(hdrs ->> 'x-forwarded-for', ''), ',', 1)), ''); end if;
  if ip is null then ip := nullif(btrim(coalesce(hdrs ->> 'x-real-ip', '')), ''); end if;
  return ip;
end $$;
revoke all on function public.client_ip() from public;
