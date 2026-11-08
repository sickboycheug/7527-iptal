// 7527iptal.org paylaşım önizlemeleri (Cloudflare Worker: vaka-onizleme)
// Rotalar: 7527iptal.org/vaka/*  ve  7527iptal.org/p/*
//   /vaka/<id>         → vaka (kendi kartıyla)
//   /p/onur-<ad-il>    → Onur Köşesi (kişinin madalya görseliyle)
//   /p/saha-<id>       → Sahadan Paylaş (kendi afişi ya da kartıyla)
//   /p/img/<anahtar>.jpg → önizleme görselinin kendisi
// Sosyal medya robotları bu sayfanın og etiketlerini okur; insanlar ilgili sayfaya yönlendirilir.
const SB = 'https://mednnlpprdgupdajmrin.supabase.co';
const KEY = 'sb_publishable_4xahmL7yt4C53MAJuorucg_qhImIEwn';
const SITE = 'https://7527iptal.org';
const YEDEK = { vaka: SITE + '/og-vaka.png?v=1', onur: SITE + '/paylas-siralama.png?v=3', saha: SITE + '/og-gonullu.png?v=1' };
const STAGE = { 'soruşturma': 'Soruşturma aşamasında', 'iddianame': 'İddianame hazırlandı', 'dava': 'Dava sürüyor', 'karar': 'Karar verildi', 'kesinleşti': 'Karar kesinleşti', 'takipsizlik': 'Takipsizlik kararı', 'bilinmiyor': 'Adli süreç bilinmiyor' };

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kisa = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

// og.js ile birebir aynı
function ozet(s) {
  let h = 0x811c9dc5; s = String(s);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return ('0000000' + h.toString(16)).slice(-8);
}
function slug(s) {
  const m = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };
  return String(s || '').replace(/[İI]/g, 'i').toLowerCase().replace(/[çğıöşüâîû]/g, c => m[c] || c)
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
const anahtar = (tur, id, parcalar) => tur + '-' + id + '-' + ozet(parcalar.join('|'));

async function rpc(fn, args) {
  const r = await fetch(SB + '/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(args || {})
  });
  if (!r.ok) throw new Error(fn + ' ' + r.status);
  return r.json();
}

// ---- içerik bulucular ----
async function vakaBul(id) {
  const rows = await rpc('list_almanac_cases');
  const c = Array.isArray(rows) ? rows.find(x => String(x.id) === String(id)) : null;
  if (!c) return null;
  let stage = '';
  try { const lg = await rpc('list_almanac_legal'); const l = (lg || []).find(x => String(x.case_id) === String(c.id)); stage = (l && l.stage) || ''; } catch (e) {}
  const yer = [c.city, c.location].filter(Boolean).join(' · ');
  return {
    tur: 'vaka',
    baslik: c.title + (yer ? ' · ' + yer : ''),
    aciklama: kisa((STAGE[stage] ? '⚖️ ' + STAGE[stage] + '. ' : '') + (c.description || 'Hayvanlara yönelik şiddet vakalarını ve davalarını takip ediyoruz.'), 220),
    hedef: SITE + '/?vaka=' + encodeURIComponent(c.id),
    key: anahtar('vaka', c.id, [c.title, c.city, c.location, String(c.case_date || '').slice(0, 10), c.category, stage]),
    w: 1200, h: 630
  };
}
function onurYer(r) { return r.ulke && r.ulke !== 'Türkiye' ? (r.il ? r.il + ', ' : '') + r.ulke : (r.il || ''); }
async function onurBul(ad) {
  const rows = await rpc('public_petition_ranking');
  const r = (Array.isArray(rows) ? rows : []).find(x => {
    const e = String(x.etiket || '').trim();
    return e && e !== 'İsimsiz' && Number(x.toplam) >= 594 && slug(e + ' ' + onurYer(x)) === ad;
  });
  if (!r) return null;
  const yer = onurYer(r);
  return {
    tur: 'onur',
    baslik: '🏅 ' + r.etiket + (yer ? ' (' + yer + ')' : '') + ' · 594 dilekçe, tek tek',
    aciklama: 'Cumhurbaşkanlığı’na, TBMM Başkanlığı’na ve 592 milletvekilinin her birine dilekçe gönderdi. Sıradaki isim seninki olsun.',
    hedef: SITE + '/?siralama=1',
    key: anahtar('onur', ad, [r.etiket, yer, r.toplam]),
    w: 1080, h: 1080
  };
}
const FP = { eylem: '📣 Eylem', dava: '⚖️ Dava', cimer: '📝 CİMER başvurusu', imza: '✍️ İmza kampanyası' };
async function sahaBul(id) {
  const rows = await rpc('gv_fp_public');
  const r = (Array.isArray(rows) ? rows : []).find(x => String(x.id) === String(id));
  if (!r) return null;
  const yer = [r.city, r.district].filter(Boolean).join(' / ') || r.country || '';
  let tarih = '';
  if (r.event_at) { try { tarih = new Date(r.event_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) {} }
  return {
    tur: 'saha',
    baslik: (FP[r.kind] || 'Sahadan') + ': ' + r.title,
    aciklama: kisa([yer, r.place, tarih].filter(Boolean).join(' · ') + (r.body ? ' — ' + r.body : ''), 220),
    hedef: SITE + '/gorev.html?saha=' + encodeURIComponent(r.id),
    key: anahtar('saha', r.id, [r.title, r.kind, r.city, r.district, r.place, r.event_at, r.has_image ? 1 : 0]),
    w: r.has_image ? 0 : 1200, h: r.has_image ? 0 : 630
  };
}

// ---- görsel: /p/img/<anahtar>.jpg ----
async function gorsel(request, key, ctx) {
  const tur = key.split('-')[0];
  if (!/^(vaka|onur|saha)-[a-z0-9-]{1,80}-[0-9a-f]{8}$/.test(key)) return new Response('yok', { status: 404 });
  const cache = caches.default, ck = new Request(SITE + '/p/img/' + key + '.jpg');
  const var_ = await cache.match(ck);
  if (var_) return var_;
  let img = null;
  try { img = await rpc('gv_og_get', { p_key: key }); } catch (e) {}
  const m = typeof img === 'string' ? /^data:image\/jpeg;base64,(.+)$/.exec(img) : null;
  if (!m) return Response.redirect(YEDEK[tur] || YEDEK.vaka, 302);
  const bin = atob(m[1]), buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  const res = new Response(buf, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable' } });
  ctx.waitUntil(cache.put(ck, res.clone()));
  return res;
}

function sayfa(d, self) {
  const img = d.var_ ? SITE + '/p/img/' + d.key + '.jpg' : YEDEK[d.tur];
  const boyut = d.var_ && d.w ? `<meta property="og:image:width" content="${d.w}">\n<meta property="og:image:height" content="${d.h}">` :
    (!d.var_ ? '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">' : '');
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(d.baslik)}</title>
<meta name="description" content="${esc(d.aciklama)}">
<meta property="og:type" content="article">
<meta property="og:locale" content="tr_TR">
<meta property="og:site_name" content="7527 İPTAL">
<meta property="og:title" content="${esc(d.baslik)}">
<meta property="og:description" content="${esc(d.aciklama)}">
<meta property="og:url" content="${esc(self)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:image:secure_url" content="${esc(img)}">
${boyut}
<meta property="og:image:alt" content="${esc(d.baslik)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(d.baslik)}">
<meta name="twitter:description" content="${esc(d.aciklama)}">
<meta name="twitter:image" content="${esc(img)}">
<style>body{margin:0;background:#0b0f0d;color:#f1f5f2;font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px}a{color:#34d399;font-weight:700}</style>
<script>location.replace(${JSON.stringify(d.hedef)});</script>
</head><body><p>Yönlendiriliyorsun… <a href="${esc(d.hedef)}">Açılmazsa buraya dokun</a></p></body></html>`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const yol = decodeURIComponent(url.pathname).replace(/\/+$/, '');
    try {
      let m = /^\/p\/img\/([a-z0-9-]+)\.jpg$/.exec(yol);
      if (m) return await gorsel(request, m[1], ctx);

      let d = null, self = SITE + yol;
      if ((m = /^\/vaka\/?(.*)$/.exec(yol))) {
        const id = m[1];
        try { d = id ? await vakaBul(id) : null; } catch (e) {}
        if (!d) d = { tur: 'vaka', baslik: 'Vaka Almanağı | 7527iptal.org', aciklama: 'Hayvanlara yönelik şiddet vakalarını ve davalarını takip ediyoruz.', hedef: SITE + (id ? '/?vaka=' + encodeURIComponent(id) : '/hakikat.html#vakalar') };
      } else if ((m = /^\/p\/onur-([a-z0-9-]+)$/.exec(yol))) {
        try { d = await onurBul(m[1]); } catch (e) {}
        if (!d) d = { tur: 'onur', baslik: 'Onur Köşesi: 594 dilekçe, tek tek', aciklama: 'Cumhurbaşkanlığı, TBMM Başkanlığı ve 592 milletvekilinin her biri. Sıralamaya gir, adını onur köşesine yaz.', hedef: SITE + '/?siralama=1' };
      } else if ((m = /^\/p\/saha-(\d+)$/.exec(yol))) {
        try { d = await sahaBul(m[1]); } catch (e) {}
        if (!d) d = { tur: 'saha', baslik: 'Sahadan Paylaş | 7527iptal.org', aciklama: 'Eylemler, davalar, CİMER başvuruları ve imza kampanyaları.', hedef: SITE + '/gorev.html' };
      } else {
        return fetch(request);   // tanımadığımız adres: siteye olduğu gibi geçer
      }
      if (d.key) { try { d.var_ = await rpc('gv_og_has', { p_key: d.key }) === true; } catch (e) { d.var_ = false; } }
      return new Response(sayfa(d, self), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=' + (d.var_ ? 300 : 30) } });
    } catch (e) {
      return Response.redirect(SITE + '/', 302);
    }
  }
};
