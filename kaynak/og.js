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
  var HAZ = {}, HAZD = {};
  // Link paylaşılmadan önce görselin kaydedilmesini bekler (en çok 10 sn); böylece sosyal medya ilk bakışta doğru görseli görür
  function hazir(url) {
    var key = String(url || '').split('/p/k/')[1];
    var p = key && HAZ[key];
    if (!p) return Promise.resolve();
    return Promise.race([p, new Promise(function (ok) { setTimeout(ok, 20000); })]);
  }
  function sayfa(o) {
    var key = anahtar(o.tur, slug(String(o.id)).slice(0, 60) || 'x', o.parcalar || [o.baslik]);
    if (!BOS[key] && o.gorsel) {
      BOS[key] = 1;
      // Bağlantı kesilirse 3 kez yeniden dener; yine olmazsa HATA işaretlenir, paylaşım penceresi uyarır
      var is = function () {
        return rpc('gv_og_meta', { p_key: key }).then(function (m) {
          if (m && m.target) return;
          return Promise.resolve(typeof o.gorsel === 'function' ? o.gorsel() : o.gorsel).then(kucult).then(function (img) {
            var wh = '', w = o.w || 0, h = o.h || 0;
            if (w && h) { var k = Math.min(1, 1200 / Math.max(w, h)); wh = Math.round(w * k) + 'x' + Math.round(h * k); }
            return rpc('gv_og_put2', { p_key: key, p_img: img, p_title: String(o.baslik || '').slice(0, 200), p_desc: String(o.aciklama || '').slice(0, 500), p_target: o.hedef || '/', p_wh: wh })
              .then(function (ok) { if (ok !== true) throw new Error('og_kayit'); });
          });
        });
      };
      var dene = function (n) { return is().catch(function (e) { if (n <= 0) throw e; return new Promise(function (ok) { setTimeout(ok, 1500); }).then(function () { return dene(n - 1); }); }); };
      HAZ[key] = dene(3).then(function () { HAZD[key] = 1; }, function () { delete BOS[key]; HAZD[key] = 'hata'; });
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
  // ---- platform sınırları ----
  // WhatsApp: 700 karakter, link korunur (ilk paragrafın hemen altında). X mavi tiksiz: 280 (link 23 sayılır).
  // Instagram: en çok 30 #etiket ve 20 @hesap (fazlası gönderiyi gizler). Mavi tikli X ve Telegram tam metni alır.
  var LINK_RE = /https?:\/\/[^\s]+/g;
  function etiketSatiri(p) { return /^([#@][^\s]+\s*)+$/.test(String(p).trim()); }
  function parcala(t, url) {
    t = String(t || ''); if (url) t = t.split(url).join('');
    var etk = [], govde = [];
    t.split(/\n{2,}/).forEach(function (p) { p = p.trim(); if (!p) return; if (etiketSatiri(p)) etk = etk.concat(p.split(/\s+/)); else govde.push(p); });
    return { govde: govde, etk: etk };
  }
  function waKisalt(t, url, sinir) {
    sinir = sinir || 700; t = String(t || '');
    var tam = url && t.indexOf(url) < 0 ? t + '\n\n' + url : t;
    if (tam.length <= sinir) return tam;
    var u = url || (t.match(LINK_RE) || []).slice(-1)[0] || '', p = parcala(t, u), ek2 = u ? '\n\n' + u : '';
    var out = p.govde.shift() || '';
    if (out.length < 60 && p.govde.length) out += '\n\n' + p.govde.shift();
    if (out.length + ek2.length > sinir) out = out.slice(0, sinir - ek2.length - 2).replace(/\s+\S*$/, '') + '…';
    out += ek2;
    p.govde.forEach(function (g) { if ((out + '\n\n' + g).length <= sinir) out += '\n\n' + g; });
    var et2 = p.etk.filter(function (e) { return e.charAt(0) === '#'; }), sat = '';
    et2.forEach(function (e) { var d = sat ? sat + ' ' + e : e; if ((out + '\n\n' + d).length <= sinir) sat = d; });
    return sat ? out + '\n\n' + sat : out;
  }
  function xUzunluk(s) { return String(s).replace(LINK_RE, '12345678901234567890123').length; }
  function xKisa(t, url, hazir2) {
    if (hazir2) { var h = String(hazir2).replace(LINK_RE, '').trim() + '\n\n' + url; if (xUzunluk(h) <= 280) return h; }
    var p = parcala(t, url), et2 = p.etk.filter(function (e) { return e.charAt(0) === '#'; });
    if (et2.indexOf('#7527İptal') < 0) et2.unshift('#7527İptal'); else { et2.splice(et2.indexOf('#7527İptal'), 1); et2.unshift('#7527İptal'); }
    // Metin bütün satırlarla alınır (yarım cümle kalmaz); yerin etiketleri için ~45 karakter ayrılır
    var sat = et2[0], yer = 280 - 23 - 4 - sat.length - 45, govde = '', dur = false;
    p.govde.join('\n').replace(LINK_RE, '').split('\n').forEach(function (l) { l = l.trim(); if (!l || dur) return; var d = govde ? govde + '\n' + l : l; if (d.length <= yer) govde = d; else { dur = true; if (!govde) govde = l.slice(0, yer - 1).replace(/\s+\S*$/, '') + '…'; } });
    var out = govde + '\n\n' + url;
    for (var i = 1; i < et2.length; i++) if (xUzunluk(out + '\n' + sat + ' ' + et2[i]) <= 280) sat += ' ' + et2[i];
    return out + '\n' + sat;
  }
  function igMetin(t) {
    var nh = 0, nm = 0;
    var s2 = String(t || '').split(/\n{2,}/).map(function (p) {
      if (!etiketSatiri(p)) return p;
      return p.trim().split(/\s+/).filter(function (e) { return e.charAt(0) === '#' ? ++nh <= 30 : ++nm <= 20; }).join(' ');
    }).filter(Boolean).join('\n\n');
    return s2.length > 2200 ? s2.slice(0, 2199) + '…' : s2;
  }
  // Tek düğme: telefonun paylaş menüsü (link + metin). Menü yoksa metin ve link kopyalanır.
  var MOBIL = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  // Bilgisayarda (paylaş menüsü olmayan ya da çalışmayan tarayıcılarda): küçük seçim kutusu
  function menu(t, url, baslik, xt, bekle, o2) {
    o2 = o2 || {};
    var e = encodeURIComponent, eski = document.getElementById('og-menu'); if (eski) eski.remove();
    var m = document.createElement('div'); m.id = 'og-menu';
    m.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;padding:16px';
    var k = document.createElement('div');
    k.style.cssText = 'background:#18181b;border:1px solid #3f3f46;border-radius:16px;padding:16px;width:100%;max-width:340px;font:600 14px Inter,system-ui,sans-serif;color:#f4f4f5';
    k.innerHTML = '<div style="font-weight:800;margin-bottom:10px">📤 Paylaş</div>';
    var uzun = (o2.xUzun || t) + '\n\n' + url;
    var hedef = [['💬 WhatsApp', 'https://api.whatsapp.com/send?text=' + e(waKisalt(o2.wa || t, url))],
      ['Telegram', 'https://t.me/share/url?url=' + e(url) + '&text=' + e(t)],
      ['𝕏 X · mavi tik (tam metin)', 'https://twitter.com/intent/tweet?text=' + e(uzun)],
      ['𝕏 X · kısa (280)', 'https://twitter.com/intent/tweet?text=' + e(xKisa(t, url, xt))],
      ['Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + e(url), 1]];
    var g = document.createElement('div'); g.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px';
    function dg(ad, f, ana) { var b = document.createElement('button'); b.type = 'button'; b.textContent = ad;
      b.style.cssText = 'padding:11px 8px;border-radius:12px;border:1px solid #3f3f46;background:' + (ana ? '#dc2626' : '#27272a') + ';color:#fff;font:700 13px Inter,system-ui,sans-serif;cursor:pointer' + (ana ? ';grid-column:1/-1' : '');
      b.onclick = f; g.appendChild(b); return b; }
    // Facebook metni almaz: metin önce panoya kopyalanır, gönderiye yapıştırılır
    var dgl = hedef.map(function (h) { return dg(h[0], function () { if (h[2]) kopya(t + '\n\n' + url); window.open(h[1], '_blank', 'noopener'); m.remove(); }); });
    if (MOBIL && navigator.share) dgl.push(dg('📱 Telefonun paylaş menüsü', function () { var tam = t + '\n\n' + url; kopya(tam); navigator.share({ title: baslik || '7527 İPTAL', text: tam }).catch(function () {}); m.remove(); }, true));
    var kb = dg('📋 Metni ve linki kopyala', function () { kopya(t + '\n\n' + url); kb.textContent = '✓ Kopyalandı, istediğin yere yapıştır'; }, true);
    dgl.push(kb);
    k.appendChild(g);
    // Önizleme görseli henüz yüklenmediyse düğmeler bekler: erken paylaşılan link görselsiz kalır (X/WA önizlemeyi bir kez alıp saklar)
    if (bekle) {
      var not = document.createElement('div'); not.textContent = '⏳ Önizleme görseli hazırlanıyor…'; not.style.cssText = 'font-size:12px;color:#fcd34d;margin:-4px 0 10px';
      k.insertBefore(not, g);
      dgl.forEach(function (b) { b.disabled = true; b.style.opacity = '.45'; });
      hazir(url).then(function () {
        var anahtar2 = String(url).split('/p/k/')[1];
        if (HAZD[anahtar2] === 1) not.remove(); else not.textContent = '⚠️ Önizleme görseli yüklenemedi (bağlantı sorunu). Bu pencereyi kapat, paylaşımı yeniden aç.';
        dgl.forEach(function (b) { b.disabled = false; b.style.opacity = ''; });
      });
    }
    var x = document.createElement('button'); x.type = 'button'; x.textContent = 'Kapat';
    x.style.cssText = 'margin-top:10px;width:100%;background:none;border:0;color:#a1a1aa;text-decoration:underline;cursor:pointer;font-size:12px';
    k.appendChild(takip());
    x.onclick = function () { m.remove(); }; k.appendChild(x);
    m.onclick = function (ev) { if (ev.target === m) m.remove(); };
    m.appendChild(k); document.body.appendChild(m);
  }
  // Tek düğme: telefonda telefonun paylaş menüsü; bilgisayarda ya da menü çalışmazsa seçim kutusu
  function paylas(o) {
    var t = o.ham ? String(o.metin || '') : ek(o.metin);
    var key = String(o.url || '').split('/p/k/')[1];
    // Telefonda da önce seçim kutusu: WhatsApp 700 karakter, X mavi tik / kısa ayrı; telefonun paylaş menüsü de içinde
    menu(t, o.url, o.baslik, o.x, !!(key && HAZ[key] && HAZD[key] !== 1), o); return 'menu';
  }
  // Ayrı ayrı: yoruma görsel eklemek, metni başka yere yapıştırmak için
  function sadeceGorsel(blob, ad) {
    var f = blob && new File([blob], ad || '7527iptal.png', { type: blob.type || 'image/png' });
    if (!f) return '';
    if (MOBIL && navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f] }).catch(function () {}); return 'menu'; }
    var a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); return 'indir';
  }
  function sadeceMetin(metin, url, ham) { kopya((ham ? String(metin || '') : ek(metin)) + (url ? '\n\n' + url : '')); return 'kopya'; }
  // Instagram gibi görsel isteyen yerler: metin kopyalanır, görsel paylaşılır; olmazsa indirilir
  // Instagram: tek pencere. Açıklama metni ekranda görünür ve kopyalanır; görsel bir kez indirilir (telefonda kaydet/paylaş menüsü)
  function gorselPaylas(o) {
    var t = igMetin((o.ham ? String(o.metin || '') : ek(o.metin)) + (o.url ? '\n\n' + o.url : ''));
    kopya(t);
    var f = o.blob && new File([o.blob], o.ad || '7527iptal.png', { type: o.blob.type || 'image/png' });
    var eski = document.getElementById('og-menu'); if (eski) eski.remove();
    var m = document.createElement('div'); m.id = 'og-menu';
    m.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;padding:16px';
    var k = document.createElement('div');
    k.style.cssText = 'background:#18181b;border:1px solid #3f3f46;border-radius:16px;padding:16px;width:100%;max-width:380px;max-height:92vh;overflow:auto;font:600 13px Inter,system-ui,sans-serif;color:#f4f4f5';
    var bas = document.createElement('div'); bas.textContent = '📸 Instagram için'; bas.style.cssText = 'font-weight:800;margin-bottom:6px'; k.appendChild(bas);
    var not = document.createElement('div'); not.textContent = '1) Görseli kaydet  2) Instagram’da görseli seç  3) Açıklamaya metni yapıştır (metin kopyalandı).';
    not.style.cssText = 'font-size:11px;color:#a1a1aa;margin-bottom:8px'; k.appendChild(not);
    var ta = document.createElement('textarea'); ta.readOnly = true; ta.value = t;
    ta.style.cssText = 'width:100%;height:150px;background:#09090b;color:#e4e4e7;border:1px solid #3f3f46;border-radius:10px;padding:8px;font:500 11px Inter,system-ui,sans-serif;resize:vertical;box-sizing:border-box';
    k.appendChild(ta);
    function dg(ad, f, renk) { var b = document.createElement('button'); b.type = 'button'; b.textContent = ad;
      b.style.cssText = 'margin-top:8px;width:100%;padding:11px 8px;border-radius:12px;border:1px solid #3f3f46;background:' + renk + ';color:#fff;font:700 13px Inter,system-ui,sans-serif;cursor:pointer';
      b.onclick = f; k.appendChild(b); return b; }
    var kb = dg('📋 Metni kopyala', function () { kopya(t); try { ta.select(); } catch (e) {} kb.textContent = '✓ Metin kopyalandı'; }, '#27272a');
    if (f) {
      var gb = dg(MOBIL && navigator.canShare && navigator.canShare({ files: [f] }) ? '🖼 Görseli kaydet / Instagram’a gönder' : '⬇️ Görseli indir', function () {
        if (MOBIL && navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f] }).catch(function () {}); }
        else { var a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); }
        gb.textContent = '✓ Görsel hazır';
      }, '#dc2626');
    }
    var x = document.createElement('button'); x.type = 'button'; x.textContent = 'Kapat';
    x.style.cssText = 'margin-top:10px;width:100%;background:none;border:0;color:#a1a1aa;text-decoration:underline;cursor:pointer;font-size:12px';
    x.onclick = function () { m.remove(); }; k.appendChild(x);
    m.onclick = function (ev) { if (ev.target === m) m.remove(); };
    m.appendChild(k); document.body.appendChild(m);
    return 'panel';
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

  // ---- harita paylaşımı (ana sayfa, pano, hakikat aynı kodu kullanır) ----
  // o: { katman: 'pet'|'mp'|'case'|'vol', sayim: { il: sayı }, xy: TR_XY }
  // Önizleme görseli haritanın kendisidir; metinde boş iller #etiket, muhatap @TBMMresmi
  var GEO = null;
  function geo() { if (!GEO) GEO = fetch('https://cdn.jsdelivr.net/gh/johan/world.geo.json@master/countries.geo.json').then(function (r) { return r.json(); }).catch(function () { GEO = null; return null; }); return GEO; }
  var MUHATAP = '@TBMMresmi';
  function haritaVeri(o) {
    var k = o.katman, xy = o.xy || {}, say = o.sayim || {}, iller = Object.keys(xy);
    var dolu = iller.filter(function (c) { return Number(say[c] || 0) > 0; });
    var bos = iller.filter(function (c) { return !(Number(say[c] || 0) > 0); }).sort(function (a, b) { return a.localeCompare(b, 'tr'); });
    var top = dolu.reduce(function (s, c) { return s + Number(say[c]); }, 0), d = dolu.length, b = bos.length;
    var T = {
      pet: [d + ' İLDEN DİLEKÇE GELDİ', b + ' İLDEN HENÜZ SES YOK', 'DİLEKÇENİ GÖNDER',
        '7527 sayılı yasanın iptali için dilekçe kampanyası sürüyor: ' + d + ' ilden dilekçe geldi, ' + b + ' ilden henüz ses yok.',
        'Henüz hiç dilekçe gelmeyen iller', 'Bu illerdensen ya da tanıdığın varsa 1 dakikanı ayır, dilekçeni gönder.',
        d + ' ilden dilekçe geldi, ' + b + ' ilden henüz ses yok. Senin ilinden ses ver, dilekçeni gönder.', '/?dilekce=1'],
      mp: [d + ' İLİN VEKİLLERİNE DİLEKÇE ULAŞTI', b + ' İLİN VEKİLLERİNE HENÜZ GİTMEDİ', 'VEKİLİNE DİLEKÇENİ GÖNDER',
        '7527 sayılı yasanın iptali için vekillere dilekçe gönderiyoruz: ' + d + ' ilin vekillerine ' + top + ' dilekçe ulaştı.',
        'Vekillerine henüz dilekçe gitmeyen iller', "Kendi ilinin vekillerine dilekçeni gönder. Her vekile giden dilekçe, Meclis'te iptal için bir ses daha.",
        d + ' ilin vekillerine dilekçe ulaştı, ' + b + ' ilin vekillerine henüz gitmedi. Vekiline sen de dilekçeni gönder.', '/?dilekce=1'],
      case: [top + ' VAKA, ' + d + ' İLDE BELGELENDİ', b + ' İLDE HENÜZ KAYIT YOK', 'VAKAYI BİLDİR',
        "7527 sonrası Türkiye'de " + d + ' ilde ' + top + ' vaka belgelendi: zehirlenen, vurulan, barınaklarda ölüme terk edilen canlar. ' + b + ' ilde ise henüz kayıt yok; bu, orada yaşanmadığı anlamına gelmiyor.',
        'Henüz vaka kaydı olmayan iller', 'Şehrindeki eski-yeni her şiddet, ihmal ve barınak vakasını bildir. Belgeleyelim, davasının takipçisi olalım.',
        d + ' ilde ' + top + ' vaka belgelendi, ' + b + ' ilde kayıt yok. Şehrindeki vakayı bildir, takipçisi olalım.', '/hakikat.html#harita'],
      vol: [d + ' İLDE GÖNÜLLÜMÜZ VAR', b + ' İLDE SENİ ARIYORUZ', 'GÖNÜLLÜ OL',
        '7527 sayılı yasanın iptali için il il örgütleniyoruz: ' + d + ' ilde gönüllümüz var.',
        'Henüz gönüllümüz olmayan iller', 'İlinde kampanyanın sesi ol, gönüllü ol.',
        d + ' ilde gönüllümüz var, ' + b + ' ilde seni arıyoruz. İlinde kampanyanın sesi ol.', '/gorev.html']
    }[k] || [];
    var etiketler = bos.map(et), mu = k === 'vol' ? '' : MUHATAP;
    var metin = T[3] + (b ? '\n\n' + T[4] + ' (' + b + '):\n' + etiketler.join(' ') : '') + '\n\n' + T[5] + (mu ? '\n\n' + mu : '');
    // X: 280 karakter (link 23 sayılır); sığdığı kadar il etiketi
    var x = T[6] + (mu ? ' ' + mu : '') + ' #7527İptal', kalan = 280 - 24 - x.length - 1, ek2 = [];
    for (var i = 0; i < etiketler.length; i++) { if (etiketler[i].length + 1 > kalan) break; ek2.push(etiketler[i]); kalan -= etiketler[i].length + 1; }
    if (ek2.length) x += '\n' + ek2.join(' ');
    return { k: k, say: say, xy: xy, d: d, b: b, top: top, bos: bos, b1: T[0], b2: T[1], cta: T[2], metin: metin, x: x, hedef: T[7] };
  }
  function haritaGorsel(v) {
    return function () {
      return Promise.resolve(document.fonts && document.fonts.load ? document.fonts.load('700 50px Oswald', 'İĞŞÇÖÜığşçöü0→').catch(function () {}) : 0).then(geo).then(function (gj) {
        var W = 1200, H = 630, c = document.createElement('canvas'); c.width = W; c.height = H;
        var x = c.getContext('2d'), O = 'Oswald, "Arial Narrow", sans-serif', RENK = v.k === 'case' ? '#dc2626' : '#10b981';
        var S = 59, X0 = 150, Y0 = 186;
        function px(lat, lon) { return [X0 + (lon - 25.5) * 0.777 * S, Y0 + (42.3 - lat) * S]; }
        x.fillStyle = '#09090b'; x.fillRect(0, 0, W, H);
        x.save(); x.beginPath(); x.rect(0, 168, W, 400); x.clip();
        ((gj && gj.features) || []).forEach(function (f) {
          if (f.id === 'ATA') return;
          var ps = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
          x.beginPath();
          ps.forEach(function (po) { po.forEach(function (r) {
            if (!r.some(function (q) { return q[0] > 18 && q[0] < 53 && q[1] > 30 && q[1] < 47; })) return;
            r.forEach(function (q, i) { var t = px(q[1], q[0]); if (i === 0) x.moveTo(t[0], t[1]); else x.lineTo(t[0], t[1]); });
            x.closePath();
          }); });
          x.fillStyle = f.id === 'TUR' ? '#3f3f46' : '#1c1c1f'; x.fill(); x.strokeStyle = '#71717a'; x.lineWidth = 1; x.stroke();
        });
        var iller = Object.keys(v.xy).sort(function (a, b) { return Number(v.say[b] || 0) - Number(v.say[a] || 0); });
        x.textAlign = 'center'; x.textBaseline = 'middle';
        iller.forEach(function (il) {
          var n = Number(v.say[il] || 0), t = px(v.xy[il][0], v.xy[il][1]);
          x.beginPath();
          if (n > 0) {
            var r = (7 + Math.min(n, 20) * 0.7) * S / 40;
            x.arc(t[0], t[1], r, 0, 7); x.globalAlpha = 0.88; x.fillStyle = RENK; x.fill(); x.globalAlpha = 1;
            x.strokeStyle = '#ecfdf5'; x.lineWidth = 1.5; x.stroke();
            x.fillStyle = '#fff'; x.font = '700 ' + (n > 99 ? 15 : 17) + 'px ' + O; x.fillText(String(n), t[0], t[1] + 1);
          } else { x.arc(t[0], t[1], 5.5, 0, 7); x.fillStyle = '#71717a'; x.fill(); x.strokeStyle = '#d4d4d8'; x.lineWidth = 1; x.stroke(); }
        });
        x.restore();
        x.textBaseline = 'alphabetic'; x.textAlign = 'left';
        x.font = '700 30px ' + O; var et1 = '7527 İPTAL!', ew = x.measureText(et1).width;
        x.fillStyle = '#dc2626'; x.fillRect(40, 34, ew + 28, 48); x.fillStyle = '#fff'; x.fillText(et1, 54, 70);
        function sigdir(t, boy, maxw) { do { x.font = '700 ' + boy + 'px ' + O; boy -= 2; } while (x.measureText(t).width > maxw && boy > 22); }
        x.fillStyle = '#fff'; sigdir(v.b1, 58, W - ew - 120); x.fillText(v.b1, ew + 92, 78);
        x.fillStyle = '#fcd34d'; sigdir(v.b2, 40, W - 80); x.fillText(v.b2, 40, 140);
        x.fillStyle = '#dc2626'; x.fillRect(0, H - 62, W, 62);
        x.fillStyle = '#fff'; x.font = '700 30px ' + O; x.fillText(v.cta + ' →', 40, H - 20);
        x.textAlign = 'right'; x.fillText('7527iptal.org', W - 40, H - 20);
        return c;
      });
    };
  }
  function haritaLink(o) {
    var v = haritaVeri(o), parca = [v.k].concat(Object.keys(v.say).filter(function (c) { return Number(v.say[c]) > 0; }).sort().map(function (c) { return c + ':' + v.say[c]; }));
    v.url = sayfa({ tur: 'harita', id: v.k, parcalar: parca, baslik: v.b1 + ' · ' + v.b2, aciklama: v.metin.split('\n')[0].slice(0, 300), hedef: v.hedef, gorsel: haritaGorsel(v), w: 1200, h: 630 });
    return v;
  }
  // Tek düğme: görsel hazırlanır (en çok 10 sn), sonra paylaş menüsü
  function haritaPaylas(o, dugme) {
    var v = haritaLink(o), eski = dugme && dugme.textContent;
    if (dugme) { dugme.disabled = true; dugme.textContent = 'Harita görseli hazırlanıyor…'; }
    return hazir(v.url).then(function () {
      if (dugme) { dugme.disabled = false; dugme.textContent = eski; }
      paylas({ baslik: v.b1, metin: v.metin, url: v.url, x: v.x });
    });
  }

  // ---- Bizi takip et: X, Instagram, YouTube (paylaş penceresinde ve her sayfanın altında) ----
  var TAKIP = [['𝕏 X', 'https://x.com/7527iptal'], ['Instagram', 'https://www.instagram.com/7527iptal.org.official/'], ['▶ YouTube', 'https://www.youtube.com/@ARA-AnimalRightsActivists?sub_confirmation=1']];
  function takip() {
    var d = document.createElement('div');
    d.className = 'og-takip';
    d.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;margin-top:12px;font:600 12px Inter,system-ui,sans-serif;color:#a1a1aa';
    var s = document.createElement('span'); s.textContent = 'Bizi takip et:'; d.appendChild(s);
    TAKIP.forEach(function (t) {
      var a = document.createElement('a'); a.href = t[1]; a.target = '_blank'; a.rel = 'noopener'; a.textContent = t[0];
      a.style.cssText = 'padding:6px 10px;border-radius:999px;border:1px solid #3f3f46;background:#27272a;color:#f4f4f5;text-decoration:none;white-space:nowrap';
      d.appendChild(a);
    });
    return d;
  }
  function takipAltlara() {
    var f = document.querySelector('footer');
    if (f && !f.querySelector('.og-takip')) f.appendChild(takip());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', takipAltlara); else takipAltlara();

  // ---- Sitedeki bütün WhatsApp paylaşımları: 700 karakteri aşan metin kısaltılır, link korunur ----
  function waDuzelt(href) {
    try {
      var u = new URL(href, location.href);
      if (!/(^|\.)(api\.whatsapp\.com|wa\.me|whatsapp\.com)$/.test(u.hostname)) return href;
      var t = u.searchParams.get('text'); if (!t || t.length <= 700) return href;
      u.searchParams.set('text', waKisalt(t, '')); return u.toString();
    } catch (e) { return href; }
  }
  // Telefonda WhatsApp/X/Telegram/Facebook yeni sekmede açılınca uygulamaya geçer, arkada boş (about:blank) sekme kalır:
  // telefonda bu bağlantılar aynı sekmeden açılır, uygulama doğrudan açılır, boş sekme oluşmaz
  var UYG = /(^|\.)(api\.whatsapp\.com|wa\.me|whatsapp\.com|twitter\.com|x\.com|t\.me|telegram\.me|facebook\.com|instagram\.com|tiktok\.com|youtube\.com|youtu\.be)$/;
  function uygulamaMi(href) { try { return UYG.test(new URL(href, location.href).hostname); } catch (e) { return false; } }
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest && ev.target.closest('a[href]'); if (!a) return;
    var h = waDuzelt(a.href); if (h !== a.href) a.href = h;
    if (MOBIL && a.target === '_blank' && uygulamaMi(a.href)) a.removeAttribute('target');
  }, true);
  var acAsil = window.open;
  window.open = function (u) {
    var a = [].slice.call(arguments); if (typeof u === 'string') a[0] = waDuzelt(u);
    if (MOBIL && typeof a[0] === 'string' && uygulamaMi(a[0])) { location.href = a[0]; return null; }
    return acAsil.apply(window, a);
  };

  window.OG = { ozet: ozet, takip: takip, slug: slug, anahtar: anahtar, kart: kart, kucult: kucult, hazirla: hazirla,
    vaka: vaka, onur: onur, onurLink: onurLink, saha: saha,
    sayfa: sayfa, hazir: hazir, vakaEtiket: vakaEtiket, vekilHazirla: vekilHazirla, ek: ek, kopya: kopya, paylas: paylas, menu: menu, gorselPaylas: gorselPaylas, sadeceGorsel: sadeceGorsel, sadeceMetin: sadeceMetin, BILGI: BILGI, ETIKET: ETIKET, waKisalt: waKisalt, vekiller: function (il) { return (VK && VK[il]) || []; }, xKisa: xKisa, igMetin: igMetin,
    haritaVeri: haritaVeri, haritaLink: haritaLink, haritaPaylas: haritaPaylas, haritaGorsel: haritaGorsel, et: et };
})();
