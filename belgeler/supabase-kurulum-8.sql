-- =====================================================================
-- 7527iptal.org - Kurulum 8: matbu dilekce metinleri + vaka almanagi
-- Tekrar calistirilabilir.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) MATBU DILEKCE METINLERI
--    Her hedef icin bir sablon: baslik, KONU, govde.
--    Baslikta kullanilabilen yer tutucular (yalnizca 'mp' icin):
--      {VEKIL_AD}  {VEKIL_PARTI}  {VEKIL_SEHIR}
-- ---------------------------------------------------------------------
create table if not exists public.petition_templates (
  recipient_type text primary key check (recipient_type in ('cb', 'mb', 'mp')),
  header         text not null,
  konu           text not null,
  body           text not null,
  updated_at     timestamptz not null default now()
);

alter table public.petition_templates enable row level security;
revoke all on public.petition_templates from anon, authenticated;

insert into public.petition_templates (recipient_type, header, konu, body) values
('cb', 'T.C. CUMHURBAŞKANLIĞI MAKAMINA', '7527 sayılı Hayvanları Koruma Kanununda Değişiklik Yapılmasına Dair Kanun''un olağanüstü toplantıyla yürürlükten kaldırılması, 5199 sayılı Kanun''a dönülmesi ve yaşam hakkı gözetilerek gerekli iyileştirmelerin yapılması talebidir.', '7527 sayılı Kanun''un sahadaki uygulamalarının yaşam hakkı, kamu vicdanı ve hayvan refahı bakımından telafisi imkansız zararlara yol açtığı açıktır. Yaşam hakkının kutsallığı ve Anayasal sorumluluk gereği; 7527 sayılı Kanun''un acilen kaldırılmasını, 5199 sayılı Kanun ilkelerine dönülmesini ve bilimsel, koruyucu politikalar geliştirilmesini saygılarımla arz ve talep ederim.'),
('mb', 'T.C. TÜRKİYE BÜYÜK MİLLET MECLİSİ BAŞKANLIĞI''NA' || chr(10) || 'Sayın Numan KURTULMUŞ', '7527 sayılı Hayvanları Koruma Kanununda Değişiklik Yapılmasına Dair Kanun''un olağanüstü toplantıyla yürürlükten kaldırılması, 5199 sayılı Kanun''a dönülmesi ve yaşam hakkı gözetilerek gerekli iyileştirmelerin yapılması talebidir.', '7527 sayılı Kanun''un sahadaki uygulamalarının yaşam hakkı, kamu vicdanı ve hayvan refahı bakımından telafisi imkansız zararlara yol açtığı açıktır. Yaşam hakkının kutsallığı ve Anayasal sorumluluk gereği; 7527 sayılı Kanun''un acilen kaldırılmasını, 5199 sayılı Kanun ilkelerine dönülmesini ve bilimsel, koruyucu politikalar geliştirilmesini saygılarımla arz ve talep ederim.'),
('mp', 'T.C. TÜRKİYE BÜYÜK MİLLET MECLİSİ' || chr(10) || 'Sayın {VEKIL_AD} ({VEKIL_PARTI} {VEKIL_SEHIR} Milletvekili)', '7527 sayılı Hayvanları Koruma Kanununda Değişiklik Yapılmasına Dair Kanun''un olağanüstü toplantıyla yürürlükten kaldırılması, 5199 sayılı Kanun''a dönülmesi ve yaşam hakkı gözetilerek gerekli iyileştirmelerin yapılması talebidir.', '7527 sayılı Kanun''un sahadaki uygulamalarının yaşam hakkı, kamu vicdanı ve hayvan refahı bakımından telafisi imkansız zararlara yol açtığı açıktır. Yaşam hakkının kutsallığı ve Anayasal sorumluluk gereği; 7527 sayılı Kanun''un acilen kaldırılmasını, 5199 sayılı Kanun ilkelerine dönülmesini ve bilimsel, koruyucu politikalar geliştirilmesini saygılarımla arz ve talep ederim.')
on conflict (recipient_type) do nothing;


create or replace function public.get_petition_templates()
returns table (recipient_type text, header text, konu text, body text)
language sql
security definer
set search_path = public
stable
as $$
  select t.recipient_type, t.header, t.konu, t.body
  from public.petition_templates t;
$$;

revoke all on function public.get_petition_templates() from public;
grant execute on function public.get_petition_templates() to anon, authenticated;


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

  if p_type not in ('cb', 'mb', 'mp') then
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


-- ---------------------------------------------------------------------
-- 2) VAKA ALMANAGI
-- ---------------------------------------------------------------------
create table if not exists public.almanac_cases (
  id          bigint generated by default as identity primary key,
  case_date   date not null,
  city        text not null,
  location    text,
  category    text not null,
  title       text not null,
  description text not null,
  source_url  text,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists almanac_published_idx
  on public.almanac_cases (published, case_date desc);

alter table public.almanac_cases enable row level security;
revoke all on public.almanac_cases from anon, authenticated;


-- Mevcut 30 vakayi aktar (yalnizca tablo bossa)
insert into public.almanac_cases (case_date, city, location, category, title, description, source_url)
select v.case_date::date, v.city, v.location, v.category, v.title, v.description, v.source_url
from (values
  ('2025-02-04', 'Erzincan', 'Erzincan Belediyesi', 'Kamu İhlali', 'Belediye köpekleri canlı canlı gömdü', 'Erzincan Belediyesi hayvan toplama aracından çıkarılan 8 köpeğin belediyeye ait çöp arıtma tesisinde açılan çukura canlı halde gömüldüğü görüntülendi.', 'https://medyascope.tv/2025/02/04/erzincanda-hayvan-katliami-iddiasi-kopekler-canli-canli-gomuldu/'),
  ('2025-02-20', 'Osmaniye', 'Osmaniye Hayvan Barınağı', 'Kamu İhlali', 'Barınakta onlarca köpek canlı gömüldü', 'Osmaniye''de hayvan barınağında onlarca köpeğin canlı halde gömüldüğü, yavruların memeden ayrılmadığı ve anne köpeklerin süt dolu olduğu görüntülendi.', 'https://haber.mynet.com/goruntuler-herkesin-kanini-dondurdu-osmaniye-de-onlarca-kopek-katledildi'),
  ('2025-09-15', 'Gaziantep', 'Gaziantep Hayvanat Bahçesi', 'Kamu İhlali', 'Bir günde 37 köpek öldü, sağlıklı köpekler yırtıcılara canlı yem', 'Gaziantep Büyükşehir Belediyesi barınağında bir günde 37 köpeğin öldüğü ve sağlıklı hayvanların yırtıcılara canlı yem verildiği iddia edildi.', 'https://medyascope.tv/2025/09/15/gaziantepte-hayvan-katliami-iddiasi-bir-gunde-37-kopek-oldu/'),
  ('2025-07-16', 'Bolu', 'Bolu İl Özel İdaresi', 'Kamu İhlali', '650 sokak köpeği öldürüldü iddiası', 'Bolu İl Özel İdaresi''nin 650 sokak köpeğini öldürdüğü iddiası gündeme geldi.', 'https://www.bolugundem.com/haber/25527132/'),
  ('2025-05-15', 'Bursa', 'Osmangazi Belediyesi Barınağı', 'Kamu İhlali', 'Barınakta onlarca köpek ilaçla öldürüldü', 'Bursa Osmangazi Belediyesi''ne ait hayvan barınağında onlarca köpeğin ilaçla öldürüldüğü iddia edildi.', 'https://www.sondakika.com/3-sayfa/haber-bursa-da-hayvan-barinaginda-katliam-onlarca-kopek-ilacla-olduruldu-18630624/'),
  ('2025-04-27', 'Ankara', 'Ankara', 'Cinsel Şiddet', 'Doktor 8 yavru köpeği istismar etti, 26 köpek kayıp', 'Ankara''da bir doktorun sahiplenme bahanesiyle eve aldığı en az 8 yavru köpeği istismar ederek öldürdüğü, 26 köpeğin kayıp olduğu ortaya çıktı.', 'https://www.nefes.com.tr/doktor-sahiplenme-bahanesiyle-evine-aldigi-hayvanlari-katletti-31448'),
  ('2025-05-10', 'Konya', 'Ardıçlı TOKİ / Konya', 'Cinsel Şiddet', 'Köpeğe cinsel istismar ve katliam', 'Konya Ardıçlı TOKİ''de makatında tahribat olan bir köpeğin ölü bulunduğu, cinsel istismar edildiği tespit edildi.', 'https://anadoludabugun.com.tr/konya-haberlerI/ozel-haber-konya-ardicli-tokide-kan-donduran-iddia-tecavuz-edilip-katledildi/242515'),
  ('2025-03-20', 'Mersin', 'Mersin', 'Zehirlenme', '77 küçükbaş hayvan zehirli ekmekle öldürüldü', 'Adana/Mersin hattında husumetlilerin zehirli ekmekle hayvanları öldürdüğü, 77 küçükbaş hayvanın telef olduğu bildirildi.', 'https://www.ntv.com.tr/galeri/turkiye/husumetlileri-zehirli-ekmekle-katliam-yapti-adanada-77-hayvan-oldu'),
  ('2025-04-29', 'Manisa', 'Manisa TOKİ', 'Zehirlenme', '2 ayda 24 köpek zehirlendi', 'Manisa TOKİ''de son 2 ayda 24 köpeğin zehirlendiği, sistematik bir katliam yürütüldüğü bildirildi.', 'https://www.manisahaberleri.com/manisa-tokide-kopek-katliami-iddiasi-son-2-ayda-24-kopek-zehirlendi'),
  ('2025-04-28', 'Sakarya', 'Sakarya Tarım Arazisi', 'Zehirlenme', '8 köpek tavuk parçasıyla zehirlendi', 'Sakarya''da tarım arazisinde 8 köpeğin tavuk parçasıyla zehirlenerek öldürüldüğü tespit edildi.', 'https://www.evrensel.net/haber/551641/'),
  ('2025-06-26', 'Kastamonu', 'Kastamonu', 'Zehirlenme', '56 arı kovanı zehirlendi, ~1 milyon arı öldü', 'Kastamonu''da 56 arı kovanının önleri kapatılarak zehirlendi, yaklaşık 1 milyon arı telef oldu.', 'https://karadenizgazete.com.tr/gundem/kastamonuda-56-ari-kovani-zehirlendi-1-milyona-yakin-ari-telef-oldu/577829'),
  ('2025-08-23', 'Batman', 'Batman Çayı', 'Kamu İhlali', 'BOTAŞ petrol hattı çalışması milyonlarca balığı öldürdü', 'Batman Çayı''nda petrol boru hattı yenileme çalışması sırasında çayın yönünün değiştirilmesi nedeniyle milyonlarca balık ve su canlısı öldü.', 'https://www.batmansonsoz.net/mobil/haber/batman-cayinda-balik-katliami-95791.html'),
  ('2025-06-30', 'Konya', 'Konya', 'Kamu İhlali', 'Baraj için dereler kurutuldu, yüz binlerce balık öldü', 'Konya''da barajda su tutulması amacıyla dereler kurutuldu, yüz binlerce balık telef oldu.', 'https://www.sozcu.com.tr/amp/baraj-icin-dereyi-kurutular-yuz-binlerce-balik-telef-oldu-p189295'),
  ('2025-07-07', 'İstanbul', 'Maltepe / İstanbul', 'Zehirlenme', 'Atık su şüphesiyle binlerce balık öldü', 'İstanbul Maltepe''de atık su şüphesiyle binlerce balığın öldüğü, 20 yıldır ilk defa bu boyutta bir olay yaşandığı belirtildi.', 'https://www.ntv.com.tr/galeri/turkiye/maltepede-supheli-balik-olumleri'),
  ('2025-07-16', 'Erzurum', 'Erzurum', 'Kamu İhlali', 'Klorlama 300.000 alabalık yavrusunu öldürdü', 'Erzurum''da Su ve Kanalizasyon İdaresi ekiplerinin klorlama yapması sebebiyle 300.000 alabalık yavrusu telef oldu.', 'https://www.gazetepusula.net/erzurum-da-yuzbinlerce-balik-telef-oldu-isletmeci-sikayetci/364083/'),
  ('2025-04-11', 'İstanbul', 'İstanbul Kimya Deposu', 'Kapatılma', 'Yangında 500-600 kurbanlık hayvan öldü', 'İstanbul''da kimya deposunda çıkan yangında 500-600 kurbanlık hayvan telef oldu.', 'https://www.turkiyegazetesi.com.tr/3-sayfa/istanbulda-kimya-deposunda-korkutan-yangin-1108097'),
  ('2025-06-04', 'Ankara', 'Ankara Yumurta Tesisi', 'Kapatılma', 'Yumurta tesisinde 150.000 tavuk yanarak öldü', 'Ankara''da bir yumurta üretim tesisinde çıkan yangında 150.000 tavuk telef oldu.', 'https://www.haberturk.com/yumurta-tesisi-alevlere-teslim-150-bin-tavuk-oldu-3796943'),
  ('2025-03-01', 'Isparta', 'Isparta', 'Kamu İhlali', 'Kuş gribi bahanesiyle 200.000+ tavuk itlaf edildi', 'Isparta''da kuş gribi vakaları sebebiyle 200.000''den fazla tavuğun itlaf edildiği bildirildi.', 'https://www.son32.com/haber/24004574/kus-gribi-vakasi-yuz-binlercesi-itlaf-edildi'),
  ('2025-08-08', 'Çorum', 'Çorum Mandıra', 'Kapatılma', 'Mandıra yangınında 100+ kuzu öldü', 'Çorum''da mandırada çıkan yangında 100''den fazla kuzu telef oldu.', 'https://www.ahaber.com.tr/viral/tikla/corumda-mandirada-yangin-faciasi-100den-fazla-kuzu-telef-6208421'),
  ('2025-06-18', 'Konya', 'Tuz Gölü', 'Kamu İhlali', 'Tuz Gölü''nde 2.000 yavru flamingo susuzluktan öldü', 'Konya Tuz Gölü''nde yavru flamingoların susuzluktan öldüğü, su yönetiminin yanlış yapıldığı belgelendi.', 'https://www.sozcu.com.tr/tuz-golu-ndeki-2-bin-flamingo-susuzluktan-oldu-p185239'),
  ('2025-06-22', 'Batman', 'Batman Kırsalı', 'Ateşli Silah', '10 yaban atı vurularak öldürüldü', 'Batman''da 10 yaban atının vurularak öldürüldüğü bildirildi.', 'https://www.rudaw.net/turkish/middleeast/turkey/220620258'),
  ('2025-02-20', 'Muğla', 'Muğla', 'Ateşli Silah', 'Yasak avda canlı mühre kullanıldı', 'Muğla''da yasa dışı avda canlı mühre kullanıldığı tespit edildi.', 'https://www.haberturk.com/kayseri-haberleri/36942295-kayseride-yasa-disi-avlanan-3-kisiye-idari-islem-uygulandi'),
  ('2025-06-21', 'Muğla', 'Muğla', 'İşkence', 'Caretta carettalar iple bağlanarak ölüme terk edildi', 'Muğla''da nesli koruma altındaki caretta carettaların iple bağlanarak ölüme terk edildiği iddia edildi.', 'https://www.sabah.com.tr/yasam/muglada-skandal-iddia-nesli-koruma-altindaki-caretta-carettalar-iple-baglanarak-olume-terk-ediliyor-7373843'),
  ('2025-06-07', 'Muğla', 'Bodrum Şehir Parkı', 'İşkence', 'Kedilerin kuyrukları kesildi, karınları yarıldı', 'Bodrum Şehir Parkı''nda kedilerin kuyruklarının kesilerek ve karınları yarılarak öldürüldüğü, savcılığın soruşturma başlattığı bildirildi.', 'https://bodrumolay.com/sehir-parkinda-kedilerin-iskence-edilerek-oldurulmesine-savcilik-sorusturma-baslatti/'),
  ('2025-05-25', 'Çorum', 'Çorum', 'Kapatılma', 'Su kuyusuna düşen 7 köpek öldü', 'Çorum''da su kuyusuna düşen 7 köpeğin öldüğü bildirildi.', 'https://www.corumtime.com/su-kuyusuna-dusen-yavru-kopekler-oldu/'),
  ('2025-04-21', 'Bursa', 'Gemlik / Bursa', 'İşkence', '8 yavru kedi kesici aletle öldürüldü', 'Bursa Gemlik''te apartman bahçesindeki 8 yavru kedinin kesici aletle öldürüldüğü tespit edildi.', 'https://www.dha.com.tr/yerel-haberler/bursa/gemlik/apartman-bahcesindeki-8-yavru-kedi-kesici-alet-2623964'),
  ('2025-04-20', 'Karaman', 'Karaman', 'Kapatılma', 'Ahır kundaklandı, 11 küçükbaş hayvan öldü', 'Karaman''da gece yarısı ahırın kundaklanması sonucu 11 küçükbaş hayvan telef oldu.', 'https://www.karamangundem.com/karamanda-gece-yarisi-kundaklama-11-hayvan-telef-oldu'),
  ('2025-03-08', 'Van', 'Van', 'Kapatılma', 'Soğukta 100 kovan arı öldü', 'Van''da soğuk hava nedeniyle kovanların içinde tutulan arıların öldüğü, 100 kovanın telef olduğu bildirildi.', 'https://dogurehberi.com/haber/vanda-100-kovan-ari-telef-oldu-2752245.html'),
  ('2025-02-18', 'Eskişehir', 'Eskişehir', 'İşkence', 'Yavru köpeklerin boynuna taş bağlanıp suya atıldı', 'Eskişehir''de yavru köpeklerin boynuna taş bağlanarak suya atıldığı, 2 köpeğin öldüğü bildirildi.', 'https://www.milliyet.com.tr/gundem/eskisehirde-yurek-sizlatan-olay-yavru-kopeklerin-boynuna-tas-baglayip-suya-attilar-7311012'),
  ('2025-01-26', 'Edirne', 'Edirne', 'Kamu İhlali', 'Belediye personeli 4 köpeği poşetle çöpe attı', 'Edirne''de belediye personelinin 4 yavru köpeği poşet içinde çöp konteynerine attığı görüntülendi.', 'https://www.haberler.com/guncel/edirne-de-sokak-hayvanlarina-skandal-muamele-4-yavru-kopek-cop-tenekesine-atildi-18304494-haberi/')
) as v(case_date, city, location, category, title, description, source_url)
where not exists (select 1 from public.almanac_cases);


create or replace function public.list_almanac_cases()
returns table (
  id bigint, case_date date, city text, location text,
  category text, title text, description text, source_url text
)
language sql
security definer
set search_path = public
stable
as $$
  select a.id, a.case_date, a.city, a.location,
         a.category, a.title, a.description, a.source_url
  from public.almanac_cases a
  where a.published
  order by a.case_date desc, a.id desc;
$$;

revoke all on function public.list_almanac_cases() from public;
grant execute on function public.list_almanac_cases() to anon, authenticated;


-- Yonetici: ekle / guncelle  (p_id null -> yeni kayit)
create or replace function public.save_almanac_case(
  p_pin         text,
  p_id          bigint,
  p_case_date   date,
  p_city        text,
  p_location    text,
  p_category    text,
  p_title       text,
  p_description text,
  p_source_url  text,
  p_published   boolean
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  if not public.verify_access_pin('admin', p_pin) then
    raise exception 'unauthorized';
  end if;

  if p_case_date is null or p_case_date > current_date then
    raise exception 'invalid_date';
  end if;

  if length(btrim(coalesce(p_city, ''))) < 2
     or length(btrim(coalesce(p_category, ''))) < 2
     or length(btrim(coalesce(p_title, ''))) < 5
     or length(btrim(coalesce(p_description, ''))) < 10 then
    raise exception 'invalid_text';
  end if;

  if p_source_url is not null and btrim(p_source_url) <> ''
     and p_source_url !~ '^https?://' then
    raise exception 'invalid_source';
  end if;

  if p_id is null then
    insert into public.almanac_cases
      (case_date, city, location, category, title, description, source_url, published)
    values
      (p_case_date, btrim(p_city), nullif(btrim(coalesce(p_location, '')), ''),
       btrim(p_category), btrim(p_title), btrim(p_description),
       nullif(btrim(coalesce(p_source_url, '')), ''), coalesce(p_published, true))
    returning id into v_id;
  else
    update public.almanac_cases
    set case_date = p_case_date,
        city = btrim(p_city),
        location = nullif(btrim(coalesce(p_location, '')), ''),
        category = btrim(p_category),
        title = btrim(p_title),
        description = btrim(p_description),
        source_url = nullif(btrim(coalesce(p_source_url, '')), ''),
        published = coalesce(p_published, true),
        updated_at = now()
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'not_found';
    end if;
  end if;

  return v_id;
end;
$$;

revoke all on function public.save_almanac_case(text, bigint, date, text, text, text, text, text, text, boolean) from public;
grant execute on function public.save_almanac_case(text, bigint, date, text, text, text, text, text, text, boolean) to anon, authenticated;


create or replace function public.delete_almanac_case(p_pin text, p_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  if not public.verify_access_pin('admin', p_pin) then
    raise exception 'unauthorized';
  end if;

  delete from public.almanac_cases where id = p_id returning id into v_id;
  return v_id is not null;
end;
$$;

revoke all on function public.delete_almanac_case(text, bigint) from public;
grant execute on function public.delete_almanac_case(text, bigint) to anon, authenticated;


create or replace function public.admin_list_almanac(p_pin text)
returns table (
  id bigint, case_date date, city text, location text,
  category text, title text, description text, source_url text, published boolean
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
  select a.id, a.case_date, a.city, a.location,
         a.category, a.title, a.description, a.source_url, a.published
  from public.almanac_cases a
  order by a.case_date desc, a.id desc;
end;
$$;

revoke all on function public.admin_list_almanac(text) from public;
grant execute on function public.admin_list_almanac(text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 3) Yetkileri tekrar geri al
-- ---------------------------------------------------------------------
revoke all on public.petition_templates from anon, authenticated;
revoke all on public.almanac_cases      from anon, authenticated;


-- =====================================================================
-- DOGRULAMA
-- =====================================================================
select has_table_privilege('anon', 'public.petition_templates', 'SELECT') as sablon_okunabilir,
       has_table_privilege('anon', 'public.almanac_cases',      'SELECT') as almanak_okunabilir;
-- Beklenen: false, false

select (select count(*) from public.petition_templates) as sablon_sayisi,
       (select count(*) from public.almanac_cases)      as vaka_sayisi;
-- Beklenen: 3, 30
