# Güvenlik ve Yedekleme

## Zorunlu üretim ayarları

1. `supabase-security-and-backup.sql` migration'ını Supabase SQL Editor'de çalıştırın.
2. Supabase Dashboard > Database > Backups bölümünde günlük yedeklemeyi ve mümkünse PITR'ı etkinleştirin.
3. Yedekleri ayrı bir depolama alanına şifreli olarak kopyalayın; ayda en az bir geri yükleme testi yapın.
4. Supabase anahtarlarında yalnızca publishable/anon anahtarı tarayıcıda bırakın. `service_role` anahtarını HTML'ye veya Git'e koymayın.
5. Üretim alan adında HTTPS, HSTS, CSP, `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff` ve güvenilir kaynaklar için dar bir izin listesi kullanın.
6. Alan adı taşınacaksa DNS TTL'ini önceden düşürün, yeni alan adında HTTPS ve CSP'yi doğrulayın, eski alan adında yalnızca kontrollü yönlendirme bırakın.

## Veri koruma

Uygulama vatandaşın T.C. kimlik numarasını tarayıcıda SHA-256 ile özetler; ham kimlik numarası Supabase'e gönderilmez. Buna rağmen T.C. kimlik numarası ve imza kişisel veri olduğundan, saklama süresi, aydınlatma metni, erişim yetkileri ve silme talepleri ayrıca işletilmelidir. Şu an istemci tarafındaki yönetici şifresi kaldırılmıştır; vaka ekleme için sunucu tarafı kimlik doğrulaması kurulmadan bu işlev açılmamalıdır.

## Sınırlar

HTML tek başına saldırı koruması, günlük yedekleme veya alan adı sürekliliği sağlayamaz. Bu kontroller hosting, Supabase ve DNS sağlayıcısında yapılandırılıp periyodik olarak test edilmelidir.