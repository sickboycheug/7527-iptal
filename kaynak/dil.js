/* 7527iptal.org dil seçici (TR / EN / DE)
   - Türkçe varsayılan; çeviri dosyası yalnızca başka dil seçilince yüklenir (/dil/xx.json).
   - Sayfadaki metni sözlükteki birebir eşleşmeyle değiştirir; dilekçe metni, PDF alanları,
     form değerleri ve seçim listeleri ASLA çevrilmez (resmi metin Türkçe kalır).
   - Seçim ?lang=en adresiyle ya da 🌐 düğmesiyle yapılır, bu cihazda hatırlanır. */
(function () {
  var DILLER = { tr: 'Türkçe', en: 'English', de: 'Deutsch' };
  var ATLA = '#print-petition,#petition-header-text,#petition-body-text,#petition-konu-text,#cp-kime,#cp-konu,#cp-mesaj,#admin-modal,#admin-box,#admin-main,#admin-login,[data-notr],script,style,noscript,textarea,select,option,input,code,#dil-sec';
  var ATTR = ['placeholder', 'title', 'aria-label', 'alt'];
  var ATLA_ATTR = ATLA.replace(',textarea,select,option,input', '');

  function oku() { try { return localStorage.getItem('dil'); } catch (e) { return null; } }
  function yaz(v) { try { localStorage.setItem('dil', v); } catch (e) {} }

  var q = (location.search.match(/[?&]lang=([a-z]{2})/) || [])[1];
  if (q && DILLER[q]) yaz(q);
  var dil = (q && DILLER[q]) ? q : (DILLER[oku()] ? oku() : 'tr');

  var harita = null, kaliplar = [];
  function nrm(s) { return s.replace(/\s+/g, ' ').trim(); }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function cevir(s) {
    if (!harita || !s) return null;
    var k = nrm(s);
    if (!k) return null;
    var v = harita[k];
    if (v != null) return v;
    for (var i = 0; i < kaliplar.length; i++) {
      var m = k.match(kaliplar[i][0]);
      if (m) return kaliplar[i][1].replace('{n}', m[1]);
    }
    return null;
  }

  function dugum(n) {
    var p = n.parentElement;
    if (!p || p.closest(ATLA)) return;
    var v = cevir(n.nodeValue);
    if (v == null) { otoSira(n); return; }
    var bas = n.nodeValue.match(/^\s*/)[0], son = n.nodeValue.match(/\s*$/)[0];
    var yeni = bas + v + son;
    if (n.nodeValue !== yeni) n.nodeValue = yeni;
  }
  function eleman(el) {
    if (el.nodeType !== 1 || el.closest(ATLA_ATTR)) return;
    for (var i = 0; i < ATTR.length; i++) {
      var a = el.getAttribute(ATTR[i]);
      if (a) { var v = cevir(a); if (v != null && v !== a) el.setAttribute(ATTR[i], v); }
    }
  }
  function tara(kok) {
    if (!kok) return;
    if (kok.nodeType === 3) { dugum(kok); return; }
    if (kok.nodeType !== 1) return;
    eleman(kok);
    if (kok.closest && kok.closest(ATLA)) return;
    var w = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) dugum(n);
    var els = kok.querySelectorAll('[placeholder],[title],[aria-label],[alt]');
    for (var i = 0; i < els.length; i++) eleman(els[i]);
  }


  /* Otomatik çeviri: sözlükte olmayan Türkçe cümleler (admin'den eklenen vakalar, duyurular, sohbet)
     Google çeviri ile çevrilir, bu cihazda saklanır; bir daha istek atılmaz. Hata olursa Türkçe kalır. */
  var OTO = {}, bekleyen = {}, kuyruk = [], aktif = 0, OKEY = 'dil_oto_' + dil;
  try { OTO = JSON.parse(localStorage.getItem(OKEY) || '{}') || {}; } catch (e) { OTO = {}; }
  var CIKTI = {};   // zaten çevrilmiş metinler: tekrar çeviriye gönderilmez
  Object.keys(OTO).forEach(function (k) { CIKTI[nrm(OTO[k])] = 1; });
  var kayitZamanla = null;
  function otoKaydet() {
    clearTimeout(kayitZamanla);
    kayitZamanla = setTimeout(function () {
      try {
        var ks = Object.keys(OTO);
        if (ks.length > 3000) ks.slice(0, ks.length - 3000).forEach(function (k) { delete OTO[k]; });
        localStorage.setItem(OKEY, JSON.stringify(OTO));
      } catch (e) {}
    }, 800);
  }
  function cevrilsinMi(k) {
    if (k.length < 12 || k.length > 4500) return false;
    if (/^(https?:|www\.)|@[\w.-]+\.\w/.test(k)) return false;
    var w = k.split(' ');
    if (w.length < 3) return false;
    return /(^|\s)[a-zçğıöşü]{2,}/.test(k);   // en az bir küçük harfli kelime (isim listelerini atlar)
  }
  function uygula(n, v) {
    if (!n.parentNode) return;
    var bas = n.nodeValue.match(/^\s*/)[0], son = n.nodeValue.match(/\s*$/)[0];
    n.nodeValue = bas + v + son;
  }
  function otoSira(n) {
    if (dil === 'tr') return;
    var k = nrm(n.nodeValue);
    if (CIKTI[k] || !cevrilsinMi(k)) return;
    if (OTO[k] != null) { uygula(n, OTO[k]); return; }
    if (bekleyen[k]) { bekleyen[k].push(n); return; }
    bekleyen[k] = [n]; kuyruk.push(k); calis();
  }
  function calis() {
    while (aktif < 3 && kuyruk.length) (function (k) {
      aktif++;
      fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=tr&tl=' + dil + '&dt=t', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: 'q=' + encodeURIComponent(k)
      }).then(function (r) { return r.json(); }).then(function (j) {
        var v = (j && j[0] || []).map(function (x) { return x[0] || ''; }).join('').trim();
        if (v) { OTO[k] = v; CIKTI[nrm(v)] = 1; otoKaydet(); (bekleyen[k] || []).forEach(function (n) { if (nrm(n.nodeValue) === k) uygula(n, v); }); }
      }).catch(function () {}).then(function () { delete bekleyen[k]; aktif--; calis(); });
    })(kuyruk.shift());
  }
  function baslat(json) {
    harita = {};
    Object.keys(json).forEach(function (k) {
      if (k.indexOf('{n}') >= 0) {
        kaliplar.push([new RegExp('^' + esc(nrm(k)).replace('\\{n\\}', '(\\d[\\d.,]*)') + '$'), json[k]]);
      } else harita[nrm(k)] = json[k];
      CIKTI[nrm(String(json[k]))] = 1;
    });
    document.documentElement.lang = dil;
    tara(document.body);
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.type === 'characterData') dugum(m.target);
        else if (m.type === 'attributes') eleman(m.target);
        else for (var j = 0; j < m.addedNodes.length; j++) tara(m.addedNodes[j]);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
    var oa = window.alert, oc = window.confirm;
    window.alert = function (s) { var v = cevir(String(s)); return oa.call(window, v != null ? v : s); };
    window.confirm = function (s) { var v = cevir(String(s)); return oc.call(window, v != null ? v : s); };
  }

  function dugme() {
    var b = document.createElement('div');
    b.id = 'dil-sec';
    b.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:9999;font-family:inherit';
    var h = '<button type="button" aria-label="Dil / Language" style="background:rgba(9,9,11,.85);color:#f4f4f5;border:1px solid #3f3f46;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer">🌐 ' + dil.toUpperCase() + '</button>' +
      '<div style="display:none;position:absolute;left:0;bottom:34px;background:#18181b;border:1px solid #3f3f46;border-radius:10px;overflow:hidden;min-width:120px">';
    Object.keys(DILLER).forEach(function (k) {
      h += '<button type="button" data-dil="' + k + '" style="display:block;width:100%;text-align:left;padding:8px 12px;background:' + (k === dil ? '#27272a' : 'transparent') + ';color:#f4f4f5;border:0;font-size:13px;cursor:pointer">' + DILLER[k] + '</button>';
    });
    b.innerHTML = h + '</div>';
    var menu = b.children[1];
    b.children[0].onclick = function (e) { e.stopPropagation(); menu.style.display = menu.style.display === 'none' ? 'block' : 'none'; };
    document.addEventListener('click', function () { menu.style.display = 'none'; });
    menu.onclick = function (e) {
      var k = e.target.getAttribute('data-dil');
      if (!k || k === dil) return;
      yaz(k);
      var u = new URL(location.href);
      if (k === 'tr') u.searchParams.delete('lang'); else u.searchParams.set('lang', k);
      location.href = u.toString();
    };
    document.body.appendChild(b);
  }

  function hazir(f) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', f); else f(); }
  hazir(function () {
    dugme();
    if (dil === 'tr') return;
    fetch('/dil/' + dil + '.json').then(function (r) { return r.json(); }).then(baslat).catch(function () {});
  });
})();
