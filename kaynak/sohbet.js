/* 7527iptal.org · Sağ altta sohbet balonu ve penceresi (Facebook/Messenger tarzı)
   Pencerenin içi gorev.html?sohbet=1: aynı sohbet, aynı giriş, aynı kurallar (24 saat, sabitlenenler).
   Sohbet yalnız balona basınca yüklenir; açık/küçük durumu sayfa değişince korunur (yalnız bu sekmede). */
(function () {
  'use strict';
  if (window.top !== window.self || window.SOHBET_MODU) return;
  var YESIL = '#059669', ZEMIN = '#18181b', KENAR = '#3f3f46';
  var balon, pencere, cerceve, sayac, zamanlayici;

  function durum(v) { try { if (v == null) return sessionStorage.getItem('sohbet_durum') || ''; sessionStorage.setItem('sohbet_durum', v); } catch (e) { return ''; } }
  function mobil() { return window.innerWidth < 640; }
  function el(t, css, x) { var e = document.createElement(t); if (css) e.style.cssText = css; if (x != null) e.textContent = x; return e; }

  function boyut() {
    if (!pencere) return;
    pencere.style.cssText = mobil()
      ? 'position:fixed;inset:0;z-index:10000;display:flex;flex-direction:column;background:' + ZEMIN + ';font-family:Inter,system-ui,sans-serif'
      : 'position:fixed;right:16px;bottom:16px;width:360px;height:min(560px,calc(100vh - 32px));z-index:10000;display:flex;flex-direction:column;background:' + ZEMIN + ';border:1px solid ' + KENAR + ';border-radius:14px;overflow:hidden;box-shadow:0 12px 32px rgba(0,0,0,.55);font-family:Inter,system-ui,sans-serif';
    if (pencere.dataset.gizli === '1') pencere.style.display = 'none';
  }
  function dugme(icerik, etiket, f) {
    var b = el('button', 'width:32px;height:32px;border:0;border-radius:8px;background:transparent;color:#34d399;font:700 18px/1 Inter,system-ui,sans-serif;cursor:pointer', icerik);
    b.type = 'button'; b.setAttribute('aria-label', etiket); b.title = etiket; b.onclick = f; return b;
  }
  function pencereKur() {
    pencere = el('div'); pencere.id = 'sohbet-pencere'; pencere.setAttribute('role', 'dialog'); pencere.setAttribute('aria-label', 'Kampanya sohbeti');
    var ust = el('div', 'display:flex;align-items:center;gap:6px;padding:8px 8px 8px 12px;border-bottom:1px solid ' + KENAR + ';background:#111113');
    var baslik = el('div', 'flex:1;min-width:0');
    baslik.appendChild(el('div', 'color:#fff;font:800 14px Inter,system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis', '💬 Kampanya Sohbeti'));
    sayac = el('div', 'color:#34d399;font:600 11px Inter,system-ui,sans-serif;min-height:14px', '');
    baslik.appendChild(sayac);
    ust.appendChild(baslik);
    ust.appendChild(dugme('–', 'Küçült', kucult));
    ust.appendChild(dugme('✕', 'Kapat', kapat));
    pencere.appendChild(ust);
    cerceve = el('iframe', 'flex:1;width:100%;border:0;background:' + ZEMIN);
    cerceve.title = 'Kampanya sohbeti';
    cerceve.src = '/gorev.html?sohbet=1';
    pencere.appendChild(cerceve);
    document.body.appendChild(pencere);
    boyut();
    // Başlıktaki çevrimiçi sayısı sohbetin kendi sayacından okunur
    zamanlayici = setInterval(function () {
      try { var o = cerceve.contentDocument && cerceve.contentDocument.getElementById('online-count'); sayac.textContent = o ? o.textContent : ''; } catch (e) {}
    }, 4000);
  }
  function ac() {
    if (!pencere) pencereKur();
    pencere.dataset.gizli = '0'; boyut();
    balon.style.display = 'none'; durum('acik');
  }
  function kucult() {
    if (pencere) { pencere.dataset.gizli = '1'; pencere.style.display = 'none'; }
    balon.style.display = 'flex'; durum('kucuk');
  }
  function kapat() {
    if (pencere) { clearInterval(zamanlayici); pencere.remove(); pencere = null; cerceve = null; }
    balon.style.display = 'flex'; durum('kapali');
  }
  function kur() {
    balon = el('button', 'position:fixed;right:16px;bottom:16px;z-index:10000;width:56px;height:56px;border-radius:50%;border:2px solid #10b981;background:' + YESIL + ';color:#fff;font-size:26px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.45)', '💬');
    balon.type = 'button'; balon.id = 'sohbet-balon'; balon.setAttribute('aria-label', 'Kampanya sohbetini aç'); balon.title = 'Kampanya sohbeti';
    balon.onclick = ac;
    document.body.appendChild(balon);
    window.addEventListener('resize', boyut);
    if (durum() === 'acik') ac();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kur); else kur();
})();
