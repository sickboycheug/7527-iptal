# Supabase Kurulum — 8. Aşama: matbu dilekçe metinleri + vaka almanağı

İki içerik alanı yöneticiden düzenlenebilir hale geliyor:

1. **Matbu dilekçe metinleri** — CB, TBMM Başkanlığı ve Milletvekili için üç ayrı şablon
   (başlık, KONU, gövde). Şu an `index.html` içinde sabit yazılı.
2. **Vaka almanağı** — mevcut 30 vaka veritabanına aktarılır, panelden ekleme/düzenleme/silme.

**Nereye:** `https://supabase.com/dashboard/project/mednnlpprdgupdajmrin/sql/new`
**Dosya:** `supabase-kurulum-8.sql` (proje kökünde, 311 satır — SQL Editor'e bu dosyayı yapıştırın)

> Dosya uzun olduğu için buraya gömmedim. Şunu çalıştırıp içeriği panonuza alabilirsiniz:
> ```
> ! cat supabase-kurulum-8.sql | clip
> ```
> ya da `! notepad supabase-kurulum-8.sql`

---

## Beklenen sonuç

| sablon_okunabilir | almanak_okunabilir |
|---|---|
| `false` | `false` |

| sablon_sayisi | vaka_sayisi |
|---|---|
| `3` | `30` |

---

## Şablonlarda yer tutucular

Yalnızca **milletvekili** şablonunun başlığında anlamlıdır:

| Yer tutucu | Karşılığı |
|---|---|
| `{VEKIL_AD}` | Ali ÖZKAYA |
| `{VEKIL_PARTI}` | AK Parti |
| `{VEKIL_SEHIR}` | Afyonkarahisar |

Varsayılan milletvekili başlığı:

```
T.C. TÜRKİYE BÜYÜK MİLLET MECLİSİ
Sayın {VEKIL_AD} ({VEKIL_PARTI} {VEKIL_SEHIR} Milletvekili)
```

Vekil seçilmemişse `{VEKIL_AD}` yerine "[Lütfen Milletvekili Seçin]" yazılır, diğer
yer tutucular boşaltılır.

Başlıkta satır atlamak için Enter'a basmanız yeterli — önizlemede ve PDF'te korunur.

---

## Ne kuruyor

**Tablolar** (ikisi de anon'a kapalı):
- `petition_templates` — recipient_type (cb/mb/mp) birincil anahtar
- `almanac_cases` — tarih, şehir, yer, kategori, başlık, açıklama, kaynak, yayın durumu

**Herkese açık okuma** (içerik zaten sayfada görünüyor):
- `get_petition_templates()`
- `list_almanac_cases()` — yalnızca `published = true` olanlar

**Yönetici PIN'i gerektirenler:**
- `save_petition_template(pin, type, header, konu, body)`
- `save_almanac_case(pin, id, tarih, şehir, yer, kategori, başlık, açıklama, kaynak, yayında)` — `id` null ise yeni kayıt
- `delete_almanac_case(pin, id)`
- `admin_list_almanac(pin)` — yayında olmayanlar dahil

**Sunucu tarafı doğrulama:** gelecek tarihli vaka reddedilir, kaynak `http(s)://` ile
başlamalı, başlık/açıklama asgari uzunlukta olmalı, metin alanları azami uzunlukta sınırlı.

**Yayın durumu:** bir vakayı silmeden gizlemek için `published = false` yapabilirsiniz;
sitede görünmez ama kayıt durur.

---

## Kategoriler

Mevcut 30 vakada kullanılanlar:

```
Kamu İhlali · Cinsel Şiddet · Zehirlenme · Kapatılma · İşkence · Ateşli Silah
```

Yeni kategori eklemek serbest — sunucu sabit bir listeyle sınırlamıyor, filtre açılır
listesi verideki kategorilerden otomatik oluşuyor.

---

## Sonrasında

SQL çalıştıktan sonra `index.html` tarafını bağlayacağım:

- Dilekçe önizlemesi ve PDF, metinleri sunucudan okuyacak (sunucuya ulaşılamazsa
  gömülü varsayılanlar devreye girer, sayfa çalışmaya devam eder)
- Almanak listesi sunucudan gelecek, "70 Belgelenmiş Vaka" iddiası gerçek sayıya bağlanacak
- Yönetici paneline iki bölüm eklenecek: şablon düzenleyici ve vaka yöneticisi
