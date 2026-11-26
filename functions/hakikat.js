// 7527iptal.org · Hakikat sayfası paylaşım önizlemesi
// /hakikat?s=<sekme ya da slayt seti> linki paylaşıldığında WhatsApp/X/Facebook/Telegram
// önizlemesi o sekmenin kendi başlığını, açıklamasını ve görselini gösterir.
// (#bulten gibi işaretler sunucuya gitmez; bu yüzden sayfa adres çubuğunu ?s= ile günceller.)
const G = 'https://7527iptal.org/gorsel/';
const SEKME = {
  bulten:   ['7527iptal Bülten', 'Kampanyadan son haberler: bildiriler, duyurular, dava ve eylem takvimi, paylaşım slaytları.', G + 'og-bulten.jpg'],
  hedef:    ['Bugünün Hedefi', 'Halkın iradesi vekillerin önünde. Egemenlik kayıtsız şartsız milletindir.', G + 'og-hedef.jpg'],
  harita:   ['Kampanya haritası', 'Senin şehrinde ne yaşandı? Eski ya da yeni, her vakayı bildir. Belgeleyelim, takipçisi olalım.', G + 'paylas-harita.png'],
  vakalar:  ['Vaka Almanağı', 'Her vaka kayıt altında. Dosyaları, davaları ve cezasızlığı takip ediyoruz.', G + 'og-vaka.png'],
  imzalar:  ['İmza kampanyaları', 'İmzala ve yay. Her imza bir can için.', G + 'og-imzalar.jpg'],
  eylemler: ['Eylemler', 'Sen de gel, sesimizi birlikte yükseltelim.', G + 'og-eylemler.jpg'],
  davalar:  ['Dava takibi', 'Cezasızlığa izin yok. Salon ne kadar doluysa cezasızlığa göz yummak o kadar zorlaşır.', G + 'og-davalar.jpg'],
  canli:    ['Canlı yayın', 'Sahadan, mahkemeden, meclisten: olanları canlı izle, sohbete katıl.', G + 'og-canli.jpg']
};
const SET = { cabbar: 'paylas-cabbar-12kasim', dilekce: 'paylas-dilekce', nimet: 'paylas-nimet', bildiri: 'paylas-bildiri', '15gun': 'paylas-15gun' };

const SB = 'https://mednnlpprdgupdajmrin.supabase.co', SBK = 'sb_publishable_4xahmL7yt4C53MAJuorucg_qhImIEwn';

// Haber/kaynak sayfasının kendi kapak görseli (og:image); bulunamazsa ''
async function kaynakGorsel(u) {
  if (!/^https?:\/\//i.test(u || '')) return '';
  try {
    const r = await fetch(u, { headers: { 'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', 'Accept': 'text/html' }, redirect: 'follow', cf: { cacheTtl: 86400 } });
    if (!r.ok || !/html/i.test(r.headers.get('content-type') || '')) return '';
    const h = (await r.text()).slice(0, 300000);
    const m = /<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*>/i.exec(h);
    const c = m && /content=["']([^"']+)["']/i.exec(m[0]);
    const img = c ? new URL(c[1].replace(/&amp;/g, '&'), r.url).href : '';
    return /^https:\/\//i.test(img) ? img : '';
  } catch (e) { return ''; }
}

// Tek vaka: kendi başlığı, açıklaması ve haberinin görseli (10 dk önbellek)
async function vaka(id, waitUntil) {
  const key = new Request('https://7527iptal.org/__og/vaka/' + id);
  const hit = await caches.default.match(key);
  if (hit) return hit.json();
  let v = null;
  try {
    const r = await fetch(SB + '/rest/v1/rpc/list_almanac_cases?id=eq.' + id + '&select=id,title,description,city,location,source_url', {
      method: 'POST', headers: { apikey: SBK, Authorization: 'Bearer ' + SBK, 'Content-Type': 'application/json' }, body: '{}'
    });
    const a = r.ok ? await r.json() : [];
    if (a && a[0]) {
      const c = a[0];
      const yer = [c.city, c.location].filter(Boolean).join(' · ');
      const d = String(c.description || '').replace(/\s+/g, ' ').trim();
      v = [c.title + (yer ? ' · ' + yer : ''), d.length > 280 ? d.slice(0, 277) + '…' : d, (await kaynakGorsel(c.source_url)) || G + 'og-vaka.png'];
    }
  } catch (e) {}
  if (v) waitUntil(caches.default.put(key, new Response(JSON.stringify(v), { headers: { 'Cache-Control': 'public, max-age=600', 'Content-Type': 'application/json' } })));
  return v;
}

function meta(html, ad) {
  const m = new RegExp('<meta[^>]+property=["\']' + ad + '["\'][^>]*>', 'i').exec(html);
  const c = m && /content=["']([^"']*)["']/i.exec(m[0]);
  return c ? c[1] : '';
}

export async function onRequestGet({ request, env, next, waitUntil }) {
  const url = new URL(request.url);
  const s = url.searchParams.get('s') || ((url.searchParams.get('il') || url.searchParams.get('vaka')) ? 'vakalar' : '');
  const vid = /^\d{1,7}$/.test(url.searchParams.get('vaka') || '') ? url.searchParams.get('vaka') : '';
  let v = vid ? await vaka(vid, waitUntil) : SEKME[s];
  if (!v && SET[s]) {
    try {
      const r = await env.ASSETS.fetch(new URL('/paylas/' + SET[s], url));
      const h = await r.text();
      v = [meta(h, 'og:title'), meta(h, 'og:description'), meta(h, 'og:image')];
      if (!v[0] || !v[2]) v = null;
    } catch (e) { v = null; }
  }
  const res = await next();
  if (!v || !/html/i.test(res.headers.get('content-type') || '')) return res;
  const [t, d, img] = v;
  const link = vid ? 'https://7527iptal.org/hakikat?vaka=' + vid : 'https://7527iptal.org/hakikat?s=' + encodeURIComponent(s);
  const set = (deger) => ({ element(e) { e.setAttribute('content', deger); } });
  return new HTMLRewriter()
    .on('title', { element(e) { e.setInnerContent(t + ' | 7527iptal.org'); } })
    .on('meta[name="description"]', set(d))
    .on('meta[property="og:title"]', set(t))
    .on('meta[property="og:description"]', set(d))
    .on('meta[property="og:url"]', set(link))
    .on('meta[property="og:image"]', set(img))
    .on('meta[name="twitter:title"]', set(t))
    .on('meta[name="twitter:description"]', set(d))
    .on('meta[name="twitter:image"]', set(img))
    .on('meta[property="og:image:width"]', { element(e) { e.remove(); } })
    .on('meta[property="og:image:height"]', { element(e) { e.remove(); } })
    .transform(res);
}
