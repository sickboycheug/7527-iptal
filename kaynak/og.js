/* 7527iptal.org · Paylaşım önizleme görselleri
   Her paylaşılan içerik (vaka, Onur Köşesi, Sahadan Paylaş) kendi görseliyle önizlenir.
   Görsel paylaşım anında tarayıcıda bir kez üretilir, küçültülür (≤ ~220 KB JPEG) ve saklanır;
   Cloudflare Worker (vaka-onizleme) bu görseli WhatsApp / X / Facebook / Telegram'a verir.
   İçerik değişirse anahtar (sondaki kısa özet) değişir, yeni görsel üretilir. */
(function () {
  var SB = 'https://mednnlpprdgupdajmrin.supabase.co';
  var KEY = 'sb_publishable_4xahmL7yt4C53MAJuorucg_qhImIEwn';
  var BOS = {};

  // Worker'daki ile birebir aynı: içerikten kısa özet (FNV-1a) ve link adı
  function ozet(s) {
    var h = 0x811c9dc5; s = String(s);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function slug(s) {
    var m = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };
    return String(s || '').replace(/[İI]/g, 'i').toLowerCase().replace(/[çğıöşüâîû]/g, function (c) { return m[c] || c; })
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }
  function anahtar(tur, id, parcalar) { return tur + '-' + id + '-' + ozet(parcalar.join('|')); }

  function rpc(fn, args) {
    return (window.sbFetch || fetch)(SB + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(args || {})
    }).then(function (r) { if (!r.ok) throw new Error('og_' + r.status); return r.json(); });
  }

  // Görseli küçültüp JPEG'e çevirir (en uzun kenar ≤ 1200 px, ≤ ~300 bin karakter)
  function kucult(kaynak) {
    return new Promise(function (ok, no) {
      function ciz(im, w, hh) {
        var k = Math.min(1, 1200 / Math.max(w, hh)), c = document.createElement('canvas');
        c.width = Math.round(w * k); c.height = Math.round(hh * k);
        var x = c.getContext('2d'); x.fillStyle = '#0b0f0d'; x.fillRect(0, 0, c.width, c.height);
        x.drawImage(im, 0, 0, c.width, c.height);
        var q = [0.86, 0.78, 0.68, 0.58, 0.48], s = '';
        for (var i = 0; i < q.length; i++) { s = c.toDataURL('image/jpeg', q[i]); if (s.length <= 300000) break; }
        ok(s);
      }
      if (kaynak && kaynak.getContext) return ciz(kaynak, kaynak.width, kaynak.height);
      var url = typeof kaynak === 'string' ? kaynak : URL.createObjectURL(kaynak), im = new Image();
      im.onload = function () { ciz(im, im.naturalWidth, im.naturalHeight); if (typeof kaynak !== 'string') URL.revokeObjectURL(url); };
      im.onerror = no; im.src = url;
    });
  }

  // Görsel yoksa içeriğin kendi bilgilerinden kart (1200×630, sitenin renk ve yazı tipleriyle)
  function kart(o) {
    var W = 1200, H = 630, c = document.createElement('canvas'); c.width = W; c.height = H;
    var x = c.getContext('2d'), O = 'Oswald, "Arial Narrow", sans-serif', I = 'Inter, "Source Sans 3", system-ui, sans-serif';
    var renk = o.renk || '#10b981';
    x.fillStyle = '#0b0f0d'; x.fillRect(0, 0, W, H);
    var g = x.createRadialGradient(980, 80, 20, 980, 80, 700); g.addColorStop(0, 'rgba(16,185,129,.18)'); g.addColorStop(1, 'rgba(11,15,13,0)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = renk; x.fillRect(0, 0, 14, H);
    x.textBaseline = 'top'; x.textAlign = 'left';
    x.font = '700 28px ' + O; x.fillStyle = '#fbbf24'; x.fillText(o.ust || '7527 İPTAL', 64, 52);
    var y = 104;
    if (o.etiket) {
      x.font = '700 26px ' + O; var ew = x.measureText(o.etiket).width + 36;
      x.fillStyle = renk; if (x.roundRect) { x.beginPath(); x.roundRect(64, y, ew, 46, 23); x.fill(); } else x.fillRect(64, y, ew, 46);
      x.fillStyle = '#ffffff'; x.fillText(o.etiket, 82, y + 8); y += 74;
    }
    // başlık: sığana kadar küçülür, en çok 3 satır
    var sz = 76, satir;
    function sar(t, w) {
      var k = String(t || '').split(/\s+/), s = [], l = '';
      k.forEach(function (p) { var d = l ? l + ' ' + p : p; if (x.measureText(d).width > w && l) { s.push(l); l = p; } else l = d; });
      if (l) s.push(l); return s;
    }
    do { x.font = '700 ' + sz + 'px ' + O; satir = sar(String(o.baslik || '').toLocaleUpperCase('tr'), W - 128); sz -= 4; } while (satir.length > 3 && sz > 40);
    sz += 4;
    if (satir.length > 3) { satir = satir.slice(0, 3); satir[2] = satir[2].replace(/\s*\S*$/, '') + '…'; }
    x.fillStyle = '#ffffff';
    satir.forEach(function (s) { x.fillText(s, 64, y); y += Math.round(sz * 1.12); });
    y += 14;
    (o.satirlar || []).filter(Boolean).slice(0, 3).forEach(function (s, i) {
      x.font = (i ? '600 30px ' : '700 32px ') + I; x.fillStyle = i ? '#d8e4dd' : '#34d399';
      var t = String(s); while (x.measureText(t).width > W - 128 && t.length > 4) t = t.slice(0, -2);
      if (t !== String(s)) t = t.replace(/\s*\S*$/, '') + '…';
      if (y < H - 120) { x.fillText(t, 64, y); y += 44; }
    });
    x.fillStyle = '#1f3a30'; x.fillRect(64, H - 92, W - 128, 2);
    x.font = '700 28px ' + I; x.fillStyle = '#f1f5f2'; x.fillText(o.alt || '#7527İptal', 64, H - 72);
    x.textAlign = 'right'; x.fillStyle = '#9db3a8'; x.fillText('7527iptal.org', W - 64, H - 72);
    return c;
  }

  // Bu içerik için görsel yoksa üretip saklar. Paylaşımı bekletmez; arka planda çalışır.
  function hazirla(key, uret) {
    if (!key || BOS[key]) return Promise.resolve();
    BOS[key] = 1;
    return rpc('gv_og_has', { p_key: key }).then(function (var_) {
      if (var_ === true) return;
      var yazi = null; try { yazi = document.fonts && Promise.all([document.fonts.load('700 40px Oswald'), document.fonts.load('700 30px Inter')]); } catch (e) {}
      return Promise.resolve(yazi).catch(function () {}).then(function () { return uret(); }).then(kucult).then(function (img) { return rpc('gv_og_put', { p_key: key, p_img: img }); });
    }).catch(function () { delete BOS[key]; });
  }

  // ---- içerik türleri: anahtar + görsel (Worker'daki hesapla birebir aynı) ----
  var STAGE = { 'soruşturma': 'Soruşturma aşamasında', 'iddianame': 'İddianame hazırlandı', 'dava': 'Dava sürüyor', 'karar': 'Karar verildi', 'kesinleşti': 'Karar kesinleşti', 'takipsizlik': 'Takipsizlik kararı', 'bilinmiyor': 'Adli süreç bilinmiyor' };
  function trTarih(d) { var p = String(d || '').slice(0, 10).split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : ''; }
  // v: { id, title, city, location, date, category, stage }
  function vaka(v) {
    var key = anahtar('vaka', v.id, [v.title, v.city, v.location, String(v.date || '').slice(0, 10), v.category, v.stage || '']);
    return hazirla(key, function () {
      return kart({ ust: 'VAKA ALMANAĞI  ·  7527 İPTAL', etiket: v.category || 'Vaka', renk: '#dc2626', baslik: v.title,
        satirlar: ['📍 ' + [[v.city, v.location].filter(Boolean).join(' · '), trTarih(v.date)].filter(Boolean).join(' · '), STAGE[v.stage] ? '⚖️ ' + STAGE[v.stage] : ''],
        alt: 'Biz vakaları ve davaları takip ediyoruz.' });
    });
  }
  // r: Onur Köşesi satırı { etiket, il, ulke, toplam }, gorsel: madalya görseli (Blob)
  function onurYer(r) { return r.ulke && r.ulke !== 'Türkiye' ? (r.il ? r.il + ', ' : '') + r.ulke : (r.il || ''); }
  function onurLink(r) { return 'https://7527iptal.org/p/onur-' + slug(r.etiket + ' ' + onurYer(r)); }
  function onur(r, gorsel) {
    var ad = slug(r.etiket + ' ' + onurYer(r));
    return hazirla(anahtar('onur', ad, [r.etiket, onurYer(r), r.toplam]), function () { return gorsel; });
  }
  // r: Sahadan Paylaş kaydı; gorselAl: kaydın kendi görselini (data URL) getiren fonksiyon
  var FP = { eylem: ['📣 EYLEM', '#dc2626'], dava: ['⚖️ DAVA', '#b45309'], cimer: ['📝 CİMER BAŞVURUSU', '#0369a1'], imza: ['✍️ İMZA KAMPANYASI', '#047857'] };
  function saha(r, gorselAl) {
    var key = anahtar('saha', r.id, [r.title, r.kind, r.city, r.district, r.place, r.event_at, r.has_image ? 1 : 0]);
    return hazirla(key, function () {
      if (r.has_image && gorselAl) return gorselAl();
      var t = FP[r.kind] || FP.eylem, yer = [r.city, r.district].filter(Boolean).join(' / ') || r.country || '', tarih = '';
      if (r.event_at) { try { tarih = new Date(r.event_at).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) {} }
      return kart({ ust: 'SAHADAN PAYLAŞ  ·  7527 İPTAL', etiket: t[0], renk: t[1], baslik: r.title,
        satirlar: [[yer, r.place].filter(Boolean).length ? '📍 ' + [yer, r.place].filter(Boolean).join(' · ') : '', tarih ? '🗓 ' + tarih : '', String(r.body || '').replace(/\s+/g, ' ').slice(0, 120)],
        alt: r.kind === 'imza' ? 'İmzala ve yay.' : r.kind === 'cimer' ? 'Sen de başvur: metin hazır.' : 'Sesimizi birlikte yükseltelim.' });
    });
  }

  // ---- genel paylaşım sayfası: /p/k/<anahtar> (kendi başlığı, açıklaması, hedefi ve görseli) ----
  // Link hemen döner; görsel arka planda bir kez kaydedilir.
  function sayfa(o) {
    var key = anahtar(o.tur, slug(String(o.id)).slice(0, 60) || 'x', o.parcalar || [o.baslik]);
    if (!BOS[key] && o.gorsel) {
      BOS[key] = 1;
      rpc('gv_og_meta', { p_key: key }).then(function (m) {
        if (m && m.target) return;
        return Promise.resolve(typeof o.gorsel === 'function' ? o.gorsel() : o.gorsel).then(kucult).then(function (img) {
          var wh = '', w = o.w || 0, h = o.h || 0;
          if (w && h) { var k = Math.min(1, 1200 / Math.max(w, h)); wh = Math.round(w * k) + 'x' + Math.round(h * k); }
          return rpc('gv_og_put2', { p_key: key, p_img: img, p_title: String(o.baslik || '').slice(0, 200), p_desc: String(o.aciklama || '').slice(0, 500), p_target: o.hedef || '/', p_wh: wh });
        });
      }).catch(function () { delete BOS[key]; });
    }
    return 'https://7527iptal.org/p/k/' + key;
  }

  // ---- ortak paylaşım metni eki: yasa bilgisi ve etiketler ----
  var BILGI = "7527 sayılı Kanun (30.07.2024) sokak hayvanlarının toplatılıp barınaklara kapatılmasını dayatıyor. Talebimiz: Kanun'un iptali ve 5199'un \"Kısırlaştır, Aşıla, Yerinde Yaşat\" ilkesine dönüş.";
  var ETIKET = '#7527İptal #7527SayılıKanun #5199 #YerindeYaşat #KısırlaştırAşılaYerindeYaşat #HayvanÖzgürlüğü #SokakHayvanları #TBMM';
  function ek(metin) {
    var t = String(metin || '').replace(/\s*#7527İptal\s*$/, '');
    if (t.indexOf('7527 sayılı Kanun (30.07.2024)') < 0) t += '\n\n' + BILGI;
    return t + '\n\n' + ETIKET;
  }
  function kopya(t) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).catch(function () {}); return; } } catch (e) {}
    var a = document.createElement('textarea'); a.value = t; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select();
    try { document.execCommand('copy'); } catch (e) {} a.remove();
  }
  // Tek düğme: telefonun paylaş menüsü (link + metin). Menü yoksa metin ve link kopyalanır.
  var MOBIL = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  // Bilgisayarda (paylaş menüsü olmayan ya da çalışmayan tarayıcılarda): küçük seçim kutusu
  function menu(t, url, baslik) {
    var e = encodeURIComponent, eski = document.getElementById('og-menu'); if (eski) eski.remove();
    var m = document.createElement('div'); m.id = 'og-menu';
    m.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;padding:16px';
    var k = document.createElement('div');
    k.style.cssText = 'background:#18181b;border:1px solid #3f3f46;border-radius:16px;padding:16px;width:100%;max-width:340px;font:600 14px Inter,system-ui,sans-serif;color:#f4f4f5';
    k.innerHTML = '<div style="font-weight:800;margin-bottom:10px">📤 Paylaş</div>';
    var hedef = [['💬 WhatsApp', 'https://api.whatsapp.com/send?text=' + e(t + '\n\n' + url)], ['𝕏 X', 'https://twitter.com/intent/tweet?text=' + e(t) + '&url=' + e(url)],
      ['Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + e(url)], ['Telegram', 'https://t.me/share/url?url=' + e(url) + '&text=' + e(t)]];
    var g = document.createElement('div'); g.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px';
    function dg(ad, f, ana) { var b = document.createElement('button'); b.type = 'button'; b.textContent = ad;
      b.style.cssText = 'padding:11px 8px;border-radius:12px;border:1px solid #3f3f46;background:' + (ana ? '#dc2626' : '#27272a') + ';color:#fff;font:700 13px Inter,system-ui,sans-serif;cursor:pointer' + (ana ? ';grid-column:1/-1' : '');
      b.onclick = f; g.appendChild(b); return b; }
    hedef.forEach(function (h) { dg(h[0], function () { window.open(h[1], '_blank', 'noopener'); m.remove(); }); });
    var kb = dg('📋 Metni ve linki kopyala', function () { kopya(t + '\n\n' + url); kb.textContent = '✓ Kopyalandı, istediğin yere yapıştır'; }, true);
    k.appendChild(g);
    var x = document.createElement('button'); x.type = 'button'; x.textContent = 'Kapat';
    x.style.cssText = 'margin-top:10px;width:100%;background:none;border:0;color:#a1a1aa;text-decoration:underline;cursor:pointer;font-size:12px';
    x.onclick = function () { m.remove(); }; k.appendChild(x);
    m.onclick = function (ev) { if (ev.target === m) m.remove(); };
    m.appendChild(k); document.body.appendChild(m);
  }
  // Tek düğme: telefonda telefonun paylaş menüsü; bilgisayarda ya da menü çalışmazsa seçim kutusu
  function paylas(o) {
    var t = o.ham ? String(o.metin || '') : ek(o.metin);
    if (MOBIL && navigator.share) {
      navigator.share({ title: o.baslik || '7527 İPTAL', text: t, url: o.url }).catch(function (err) { if (!err || err.name !== 'AbortError') menu(t, o.url, o.baslik); });
      return 'menu';
    }
    menu(t, o.url, o.baslik); return 'menu';
  }
  // Instagram gibi görsel isteyen yerler: metin kopyalanır, görsel paylaşılır; olmazsa indirilir
  function gorselPaylas(o) {
    var t = ek(o.metin) + (o.url ? '\n\n' + o.url : '');
    kopya(t);
    var f = o.blob && new File([o.blob], o.ad || '7527iptal.jpg', { type: o.blob.type || 'image/png' });
    if (f && navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f], text: t }).catch(function () {}); return 'menu'; }
    if (f) { var a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); }
    return 'indir';
  }

  // ---- vaka paylaşımı: il/ilçe etiketleri ve o ilin vekillerinin hesapları ----
  var VK = null, VKY = null;
  function vekilHazirla() {
    if (!VKY) VKY = fetch('/veri/vekil-hesaplari.txt').then(function (r) { return r.text(); }).then(function (t) {
      VK = {};
      t.split('\n').forEach(function (l) { if (!l || l[0] === '#') return; var p = l.split('|'); if (p.length < 4) return; (VK[p[2]] = VK[p[2]] || []).push({ ad: p[1], x: p[3], ig: p[4] }); });
    }).catch(function () { VKY = null; });
    return VKY;
  }
  function et(s) { return '#' + String(s || '').split(/\s+/).map(function (k) { return k.charAt(0).toLocaleUpperCase('tr') + k.slice(1).toLocaleLowerCase('tr'); }).join('').replace(/[^0-9A-Za-zÇĞİÖŞÜçğıöşü]/g, ''); }
  function vakaEtiket(il, yer) {
    if (!il) return '';
    var ilce = String(yer || '').split(/[·\/,]/)[0].trim(), tags = [];
    if (ilce && ilce.toLocaleLowerCase('tr') !== il.toLocaleLowerCase('tr') && ilce.length < 30) tags.push(et(ilce));
    tags.push(et(il), et(il + ' Milletvekilleri'));
    var v = (VK && VK[il]) || [], h = v.map(function (k) { return k.x ? '@' + k.x : ''; }).filter(Boolean).slice(0, 20);
    return tags.join(' ') + (h.length ? '\n' + h.join(' ') : '');
  }
  try { vekilHazirla(); } catch (e) {}

  window.OG = { ozet: ozet, slug: slug, anahtar: anahtar, kart: kart, kucult: kucult, hazirla: hazirla,
    vaka: vaka, onur: onur, onurLink: onurLink, saha: saha,
    sayfa: sayfa, vakaEtiket: vakaEtiket, vekilHazirla: vekilHazirla, ek: ek, kopya: kopya, paylas: paylas, menu: menu, gorselPaylas: gorselPaylas, BILGI: BILGI, ETIKET: ETIKET };
})();
