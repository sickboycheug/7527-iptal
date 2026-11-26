// 7527iptal.org · Kart görseli: /kapak?u=<haber/kampanya linki>
// Linkteki sayfanın kendi kapak görselini (og:image) bulur ve tarayıcıyı o görsele yönlendirir.
// Görsel bizim sunucumuzdan geçmez (yük yok); bulunan adres 7 gün önbellekte tutulur.
// Bulunamazsa 404 döner, sayfa o kartta sitenin kendi tür görselini gösterir.
export async function onRequestGet({ request, waitUntil }) {
  const u = new URL(request.url).searchParams.get('u') || '';
  if (!/^https?:\/\/[^\s]+$/i.test(u) || u.length > 800) return new Response('', { status: 400 });
  const cache = caches.default;
  const key = new Request('https://7527iptal.org/kapak?u=' + encodeURIComponent(u));
  const hit = await cache.match(key);
  if (hit) return hit;
  let img = '';
  try {
    const r = await fetch(u, {
      headers: { 'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', 'Accept': 'text/html' },
      redirect: 'follow', cf: { cacheTtl: 86400 }
    });
    if (r.ok && /html/i.test(r.headers.get('content-type') || '')) {
      const html = (await r.text()).slice(0, 300000);
      const m = /<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*>/i.exec(html);
      const c = m && /content=["']([^"']+)["']/i.exec(m[0]);
      if (c) img = new URL(c[1].replace(/&amp;/g, '&'), r.url).href;
    }
  } catch (e) {}
  const res = /^https:\/\//i.test(img)
    ? new Response(null, { status: 302, headers: { Location: img, 'Cache-Control': 'public, max-age=604800' } })
    : new Response('', { status: 404, headers: { 'Cache-Control': 'public, max-age=86400' } });
  waitUntil(cache.put(key, res.clone()));
  return res;
}
