/* Supabase isteklerini sitenin kendi adresinden (7527iptal.org/sb/) geçirir.
   Reklam/izleyici engelleyiciler sitenin kendi adresini kesmez; ayrıca her istekte ek CORS turu olmaz.
   Köprü çalışmazsa istek kendiliğinden doğrudan Supabase'e gider (site asla bozulmaz). */
(function () {
  var SB = 'https://mednnlpprdgupdajmrin.supabase.co';
  var acik = /(^|\.)7527iptal\.org$/.test(location.hostname);
  var kapali = false;
  window.sbFetch = function (input, init) {
    var u = typeof input === 'string' ? input : (input instanceof URL ? input.href : null);
    if (!acik || kapali || !u || (u.indexOf(SB + '/rest/v1/') !== 0 && u.indexOf(SB + '/storage/v1/') !== 0)) return fetch(input, init);
    var get = !init || !init.method || /^(GET|HEAD)$/i.test(init.method);
    return fetch('/sb' + u.slice(SB.length), init).then(function (r) {
      if (r.headers.get('x-sb-kopru')) return r;
      kapali = true; return fetch(input, init);          // köprü yok: istek Supabase'e hiç ulaşmadı, doğrudan git
    }, function (e) {
      if (get) { kapali = true; return fetch(input, init); }
      throw e;                                             // yazma isteği iki kez gitmesin
    });
  };
  window.SB_SECENEK = { global: { fetch: function (a, b) { return window.sbFetch(a, b); } } };
})();
