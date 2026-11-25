/* 7527iptal.org · Paylaşım takibi
   1) Dışarı giden her paylaşım bağlantısına platform etiketi ekler (?k=wa, tg, x, fb, tel, kop).
      Sitedeki paylaşım düğmelerine tek tek dokunmadan: paylaşım pencereleri burada yakalanır.
   2) Etiketli bağlantıyla gelen ziyareti bir kez kaydeder (aynı sekmede tekrar sayılmaz).
   3) Dilekçe "Gönderdim" ile onaylanınca etiketi dilekçe numarasıyla kaydeder (KT.dilekce).
   Etiket yalnız o ziyaret boyunca (sekme kapanana kadar) tutulur. Ad, iletişim, IP tutulmaz. */
(function () {
  'use strict';
  var API = 'https://mednnlpprdgupdajmrin.supabase.co/rest/v1/rpc/';
  var KEY = 'sb_publishable_4xahmL7yt4C53MAJuorucg_qhImIEwn';
  var RE = /^[a-z0-9-]{1,40}$/;
  var SITE = /https?:\/\/(?:www\.)?7527iptal\.org[^\s"'<>]*/g;

  function rpc(fn, govde) {
    try {
      fetch(API + fn, { method: 'POST', keepalive: true,
        headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(govde) }).catch(function () {});
    } catch (e) {}
  }
  function oku() { try { return JSON.parse(sessionStorage.getItem('kt') || 'null'); } catch (e) { return null; } }
  function yaz(o) { try { sessionStorage.setItem('kt', JSON.stringify(o)); } catch (e) {} }

  // ---- Metindeki site bağlantılarına etiket ekle (varsa eskisini değiştir) ----
  function etiketle(metin, p) {
    if (!RE.test(p)) return metin;
    return String(metin).replace(SITE, function (u) {
      var son = (u.match(/[).,;:!?]+$/) || [''])[0];
      if (son) u = u.slice(0, -son.length);
      var hs = '', i = u.indexOf('#');
      if (i >= 0) { hs = u.slice(i); u = u.slice(0, i); }
      u = u.replace(/([?&])k=[^&]*&?/, '$1').replace(/[?&]$/, '');
      return u + (u.indexOf('?') >= 0 ? '&' : '?') + 'k=' + p + hs + son;
    });
  }
  // Paylaşım adresinin hangi platform olduğunu bul
  function platform(adres) {
    var h = '';
    try { h = new URL(adres, location.href).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
    if (h === 'api.whatsapp.com' || h === 'wa.me' || h === 'web.whatsapp.com') return 'wa';
    if (h === 't.me' || h === 'telegram.me') return 'tg';
    if (h === 'twitter.com' || h === 'x.com') return 'x';
    if (h === 'facebook.com' || h === 'm.facebook.com') return 'fb';
    return '';
  }
  // Paylaşım adresinin içindeki (text=, url=, u=) site bağlantılarını etiketle
  function paylasimAdresi(adres) {
    var p = platform(adres); if (!p) return adres;
    var i = adres.indexOf('?'); if (i < 0) return adres;
    var hs = '', j = adres.indexOf('#', i); if (j >= 0) { hs = adres.slice(j); adres = adres.slice(0, j); }
    var sorgu = adres.slice(i + 1).split('&').map(function (parca) {
      var e = parca.indexOf('='); if (e < 0) return parca;
      var deger = parca.slice(e + 1), d;
      try { d = decodeURIComponent(deger.replace(/\+/g, '%20')); } catch (x) { return parca; }
      var y = etiketle(d, p);
      return y === d ? parca : parca.slice(0, e + 1) + encodeURIComponent(y);
    }).join('&');
    return adres.slice(0, i + 1) + sorgu + hs;
  }

  // ---- 1) Giden paylaşımlar ----
  try {
    var asilOpen = window.open;
    window.open = function (u) {
      var a = Array.prototype.slice.call(arguments);
      try { if (typeof u === 'string') a[0] = paylasimAdresi(u); } catch (e) {}
      return asilOpen.apply(window, a);
    };
  } catch (e) {}
  // Sayfadaki hazır <a href="https://wa.me/..."> paylaşım bağlantıları
  document.addEventListener('click', function (ev) {
    try {
      var a = ev.target && ev.target.closest && ev.target.closest('a[href]');
      if (a && platform(a.href)) { var y = paylasimAdresi(a.href); if (y !== a.href) a.href = y; }
    } catch (e) {}
  }, true);
  // Telefonun paylaş menüsü
  try {
    if (navigator.share) {
      var asilShare = navigator.share.bind(navigator);
      navigator.share = function (d) {
        try { if (d) { d = Object.assign({}, d); if (d.url) d.url = etiketle(d.url, 'tel'); if (d.text) d.text = etiketle(d.text, 'tel'); } } catch (e) {}
        return asilShare(d);
      };
    }
  } catch (e) {}

  // ---- 2) Etiketli gelen ziyaret ----
  try {
    var k = '', kaynak = '', q = new URLSearchParams(location.search);
    if (RE.test(q.get('k') || '')) {
      k = q.get('k'); kaynak = location.pathname;
      // Etiket adres çubuğundan kaldırılır: sayfa içinden yeniden paylaşılırsa eski etiket taşınmaz
      q.delete('k');
      var qs = q.toString();
      history.replaceState(history.state, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    } else if (document.referrer) {
      // Paylaşım sayfası (/p/..., /cagri/..., /paylas/...) siteye yönlendirdiyse etiket oradan okunur
      var r = new URL(document.referrer);
      if (r.host === location.host && RE.test(r.searchParams.get('k') || '')) { k = r.searchParams.get('k'); kaynak = r.pathname; }
    }
    if (k) {
      kaynak = kaynak.slice(0, 160);
      var o = oku();
      if (!o || o.k !== k || o.y !== kaynak) { yaz({ k: k, y: kaynak }); rpc('kt_kaydet', { p_olay: 'ziyaret', p_k: k, p_kaynak: kaynak }); }
    }
  } catch (e) {}

  // ---- 3) Onaylanan dilekçe ----
  window.KT = {
    etiketle: etiketle,
    dilekce: function (no, hedef, ulke, il) {
      var o = oku(); if (!o || !no) return;
      rpc('kt_kaydet', { p_olay: 'dilekce', p_k: o.k, p_kaynak: o.y, p_no: String(no),
        p_hedef: hedef || null, p_ulke: ulke || null, p_il: il || null });
    }
  };
})();
