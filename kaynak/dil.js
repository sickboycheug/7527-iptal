/* 7527iptal.org dil seçici (TR / EN / DE)
   - Türkçe varsayılan; çeviri dosyası yalnızca başka dil seçilince yüklenir (/dil/xx.json).
   - Sayfadaki metni sözlükteki birebir eşleşmeyle değiştirir; dilekçe metni, PDF alanları,
     form değerleri ve seçim listeleri ASLA çevrilmez (resmi metin Türkçe kalır).
   - Seçim ?lang=en adresiyle ya da 🌐 düğmesiyle yapılır, bu cihazda hatırlanır. */
(function () {
  var DILLER = { tr: 'Türkçe', en: 'English', de: 'Deutsch' };
  var ATLA = '#print-petition,#petition-header-text,#petition-body-text,#petition-konu-text,#cp-kime,#cp-konu,#cp-mesaj,#admin-modal,#admin-box,#admin-main,#admin-login,[data-notr],script,style,noscript,textarea,select,option,input,code,#dil-sec';
  var ATTR = ['placeholder', 'title', 'aria-label', 'alt'];

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
    if (v == null) return;
    var bas = n.nodeValue.match(/^\s*/)[0], son = n.nodeValue.match(/\s*$/)[0];
    var yeni = bas + v + son;
    if (n.nodeValue !== yeni) n.nodeValue = yeni;
  }
  function eleman(el) {
    if (el.nodeType !== 1 || el.closest(ATLA)) return;
    for (var i = 0; i < ATTR.length; i++) {
      var a = el.getAttribute(ATTR[i]);
      if (a) { var v = cevir(a); if (v != null && v !== a) el.setAttribute(ATTR[i], v); }
    }
  }
  function tara(kok) {
    if (!kok) return;
    if (kok.nodeType === 3) { dugum(kok); return; }
    if (kok.nodeType !== 1) return;
    if (kok.closest && kok.closest(ATLA)) return;
    eleman(kok);
    var w = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) dugum(n);
    var els = kok.querySelectorAll('[placeholder],[title],[aria-label],[alt]');
    for (var i = 0; i < els.length; i++) eleman(els[i]);
  }

  function baslat(json) {
    harita = {};
    Object.keys(json).forEach(function (k) {
      if (k.indexOf('{n}') >= 0) {
        kaliplar.push([new RegExp('^' + esc(nrm(k)).replace('\\{n\\}', '(\\d[\\d.,]*)') + '$'), json[k]]);
      } else harita[nrm(k)] = json[k];
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
    b.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;font-family:inherit';
    var h = '<button type="button" aria-label="Dil / Language" style="background:rgba(9,9,11,.85);color:#f4f4f5;border:1px solid #3f3f46;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer">🌐 ' + dil.toUpperCase() + '</button>' +
      '<div style="display:none;position:absolute;right:0;top:34px;background:#18181b;border:1px solid #3f3f46;border-radius:10px;overflow:hidden;min-width:120px">';
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
