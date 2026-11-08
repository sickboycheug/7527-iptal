/* Uygulama içi tarayıcı (Instagram, TikTok, Facebook, X...) yakalayıcı.
   Bu tarayıcılar PDF indirmeyi, e-posta uygulamasını açmayı ve girişi engelliyor.
   Kişiyi tek dokunuşla gerçek tarayıcıya geçirir. */
(function () {
  var ua = navigator.userAgent || '';
  var re = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|musical_ly|BytedanceWebview|TikTok|Twitter|LinkedInApp|Snapchat|Pinterest|Line\//i;
  if (!re.test(ua)) { window.INAPP = null; return; }

  var ios = /iPhone|iPad|iPod/i.test(ua);
  var android = /Android/i.test(ua);
  var app = /Instagram/i.test(ua) ? 'Instagram' : /musical_ly|BytedanceWebview|TikTok/i.test(ua) ? 'TikTok'
          : /FBAN|FBAV|FB_IAB|FBIOS/i.test(ua) ? 'Facebook' : /Twitter/i.test(ua) ? 'X' : 'bu uygulama';
  var url = location.href;

  function kopyala() {
    try { if (navigator.clipboard) navigator.clipboard.writeText(url).catch(function () {}); } catch (e) {}
    try {
      var t = document.createElement('textarea'); t.value = url; t.setAttribute('readonly', '');
      t.style.cssText = 'position:fixed;top:-100px;opacity:0'; document.body.appendChild(t);
      t.select(); document.execCommand('copy'); document.body.removeChild(t);
    } catch (e) {}
  }

  function ac() {
    kopyala();
    if (android) {
      var u = url.replace(/^https?:\/\//, '');
      location.href = 'intent://' + u + '#Intent;scheme=https;S.browser_fallback_url=' + encodeURIComponent(url) + ';end';
    } else if (ios) {
      location.href = 'x-safari-' + url;
    }
  }

  var tarif = ios
    ? 'Açılmazsa: sağ üstteki ••• simgesine dokun, "Harici tarayıcıda aç" seç. Link kopyalandı, Safari\'ye yapıştırıp da girebilirsin.'
    : 'Açılmazsa: sağ üstteki ⋮ simgesine dokun, "Tarayıcıda aç" seç. Link kopyalandı, Chrome\'a yapıştırıp da girebilirsin.';

  var css = 'position:sticky;top:0;z-index:9999;background:#f59e0b;color:#000;font:600 13px/1.4 Inter,system-ui,sans-serif;padding:10px 14px;text-align:center';
  var btn = 'display:inline-block;margin-top:6px;background:#000;color:#fff;border:0;border-radius:10px;padding:9px 16px;font:700 13px Inter,system-ui,sans-serif;cursor:pointer';

  function serit() {
    if (document.getElementById('inapp-serit')) return;
    var d = document.createElement('div');
    d.id = 'inapp-serit'; d.style.cssText = css;
    d.innerHTML = '⚠️ ' + app + ' içinden açtın. Dilekçe göndermek ve dosya indirmek için sayfayı tarayıcıda aç.<br>';
    var b = document.createElement('button'); b.type = 'button'; b.style.cssText = btn;
    b.textContent = '🌐 Tarayıcıda aç';
    var p = document.createElement('div'); p.style.cssText = 'font-weight:500;font-size:12px;margin-top:6px;display:none';
    p.textContent = tarif;
    b.onclick = function () { p.style.display = 'block'; ac(); };
    d.appendChild(b); d.appendChild(p);
    document.body.insertBefore(d, document.body.firstChild);
  }

  // Engellenen bir işleme basıldığında: tam ekran, tek düğme
  function uyar() {
    var m = document.getElementById('inapp-modal');
    if (!m) {
      m = document.createElement('div'); m.id = 'inapp-modal';
      m.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;padding:16px';
      var k = document.createElement('div');
      k.style.cssText = 'max-width:380px;width:100%;background:#18181b;border:1px solid #f59e0b;border-radius:16px;padding:20px;color:#f4f4f5;font:14px/1.5 Inter,system-ui,sans-serif;text-align:center';
      k.innerHTML = '<div style="font-size:28px">🌐</div><div style="font-weight:800;font-size:16px;margin:6px 0">Tarayıcıda aç, oradan devam et</div>' +
        '<div style="color:#d4d4d8">' + app + ' kendi içinde PDF indirmeye ve e-posta göndermeye izin vermiyor, dilekçe buradan gönderilemez. Tarayıcıda aç, dilekçeni orada doldur.</div>';
      var b = document.createElement('button'); b.type = 'button';
      b.style.cssText = btn + ';background:#f59e0b;color:#000;width:100%;margin-top:14px;padding:12px';
      b.textContent = '🌐 Tarayıcıda aç';
      var p = document.createElement('div'); p.style.cssText = 'font-size:12px;color:#a1a1aa;margin-top:10px';
      p.textContent = tarif;
      b.onclick = ac;
      var x = document.createElement('button'); x.type = 'button';
      x.style.cssText = 'margin-top:10px;background:none;border:0;color:#a1a1aa;font-size:12px;text-decoration:underline;cursor:pointer';
      x.textContent = 'Kapat';
      x.onclick = function () { m.style.display = 'none'; };
      k.appendChild(b); k.appendChild(p); k.appendChild(x); m.appendChild(k);
      document.body.appendChild(m);
    }
    m.style.display = 'flex';
    kopyala();
  }

  window.INAPP = { app: app, ac: ac, uyar: uyar };
  if (document.body) serit(); else document.addEventListener('DOMContentLoaded', serit);
  // Dilekçe formuna yazmaya başlayınca bir kez uyar (emek boşa gitmesin)
  var uyarildi = false;
  document.addEventListener('focusin', function (e) {
    if (!uyarildi && e.target && e.target.id === 'citizen-name') { uyarildi = true; uyar(); }
  });
})();
