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

function meta(html, ad) {
  const m = new RegExp('<meta[^>]+property=["\']' + ad + '["\'][^>]*>', 'i').exec(html);
  const c = m && /content=["']([^"']*)["']/i.exec(m[0]);
  return c ? c[1] : '';
}

export async function onRequestGet({ request, env, next }) {
  const url = new URL(request.url);
  const s = url.searchParams.get('s') || ((url.searchParams.get('il') || url.searchParams.get('vaka')) ? 'vakalar' : '');
  let v = SEKME[s];
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
  const link = 'https://7527iptal.org/hakikat?s=' + encodeURIComponent(s);
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
