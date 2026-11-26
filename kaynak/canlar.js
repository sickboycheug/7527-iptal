// 7527iptal.org · Kaybettiğimiz canlar
// Sitedeki "Paylaş" ve "Dilekçe gönder" düğmelerinde, Vaka Almanağı'nda öldürüldüğü kayıtlı canların adları
// sırayla yanıp söner: "Cabbar için gönder", "Eros için paylaş"… Arada düğmenin kendi yazısı da görünür.
// Adlar /veri/canlar.json dosyasından gelir. Düğme o an başka bir şey yazıyorsa ("Gönderiliyor…") dokunulmaz.
(function () {
  var PAY = ['paylaş', 'share', 'teilen'];
  var DIL = ['dilekçe gönder', 'e-posta ile dilekçeyi gönder', 'send petition', 'petition senden', 'send the petition by e-mail', 'petition per e-mail senden'];
  var AD = [], i = 0;
  function sade(t) { return String(t || '').replace(/[^\p{L}\s-]/gu, ' ').replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr'); }
  function dil() { return (document.documentElement.lang || 'tr').slice(0, 2); }
  function yazi(m, n) {
    var d = dil();
    if (m === 'p') return d === 'en' ? 'Share for ' + n : d === 'de' ? 'Für ' + n + ' teilen' : n + ' için paylaş';
    return d === 'en' ? 'Send for ' + n : d === 'de' ? 'Für ' + n + ' senden' : n + ' için gönder';
  }
  // Düğmenin son yazı parçasını <span class="cn-ad"> içine alır; emoji ve simgeler yerinde kalır
  function hazirla(el) {
    if (el.closest('[data-notr],#admin-box,#admin-modal,#adm-box')) return null;
    var s = el.querySelector('.cn-ad');
    if (s) return s;
    var m = el.getAttribute('data-cn');
    if (!m) {
      var t = sade(el.textContent);
      m = PAY.indexOf(t) !== -1 ? 'p' : DIL.indexOf(t) !== -1 ? 'd' : '';
      if (!m) return null;
      el.setAttribute('data-cn', m);
    } else if (PAY.indexOf(sade(el.textContent)) === -1 && DIL.indexOf(sade(el.textContent)) === -1) return null;
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), n, son = null;
    while ((n = w.nextNode())) if (/\p{L}/u.test(n.nodeValue)) son = n;
    if (!son) return null;
    var v = son.nodeValue, a = v.search(/\p{L}/u), b = v.length - v.split('').reverse().join('').search(/\p{L}/u);
    s = document.createElement('span'); s.className = 'cn-ad'; s.setAttribute('data-notr', '');
    s.setAttribute('data-ilk', v.slice(a, b)); s.textContent = v.slice(a, b);
    var p = son.parentNode;
    if (a > 0) p.insertBefore(document.createTextNode(v.slice(0, a)), son);
    p.insertBefore(s, son);
    if (b < v.length) p.insertBefore(document.createTextNode(v.slice(b)), son);
    p.removeChild(son);
    return s;
  }
  function tur() {
    if (document.visibilityState !== 'visible' || !AD.length) return;
    var k = i % (AD.length + 1), ad = k === AD.length ? '' : AD[k]; i++;
    var L = [];
    Array.prototype.forEach.call(document.querySelectorAll('button, a'), function (el) {
      if (!el.offsetParent) return;
      var s = hazirla(el); if (s) L.push([el, s]);
    });
    L.forEach(function (x) { x[1].classList.add('cn-sn'); });
    setTimeout(function () {
      L.forEach(function (x) {
        var el = x[0], s = x[1];
        if (!el.contains(s)) return;
        s.textContent = ad ? yazi(el.getAttribute('data-cn'), ad) : s.getAttribute('data-ilk');
        s.classList.remove('cn-sn');
      });
    }, 450);
  }
  var st = document.createElement('style');
  st.textContent = '.cn-ad{transition:opacity .45s}.cn-ad.cn-sn{opacity:0}';
  document.head.appendChild(st);
  fetch('/veri/canlar.json').then(function (r) { return r.ok ? r.json() : []; }).then(function (a) {
    if (!Array.isArray(a) || !a.length) return;
    AD = a; setInterval(tur, 2600);
  }).catch(function () {});
})();
