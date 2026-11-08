const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: path.join(__dirname, 'campaign-video-output'), size: { width: 1280, height: 720 } } });
  const page = await context.newPage();
  await page.goto(`file://${path.join(__dirname, 'index.html')}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.textContent = '#video-caption{position:fixed;z-index:9999;left:50%;bottom:24px;transform:translateX(-50%);padding:14px 24px;border:2px solid #facc15;border-radius:8px;background:rgba(9,9,11,.96);color:#fff;font:800 22px Inter,sans-serif;text-align:center;white-space:pre-line;box-shadow:0 8px 30px rgba(0,0,0,.5)}.video-focus{outline:5px solid #facc15!important;outline-offset:6px}.video-mock{position:fixed;inset:70px 90px;z-index:9998;background:#f8fafc;color:#0f172a;border:4px solid #334155;border-radius:12px;box-shadow:0 20px 60px #000b;font:16px Inter,sans-serif;overflow:hidden}';
    document.head.appendChild(style);
    const caption = document.createElement('div'); document.body.appendChild(caption); caption.id = 'video-caption';
    window.setVideoCaption = (text) => { caption.textContent = text; };
    window.focusVideo = (selector) => { document.querySelectorAll('.video-focus').forEach((el) => el.classList.remove('video-focus')); const el = document.querySelector(selector); if (el) { el.classList.add('video-focus'); el.scrollIntoView({ behavior: 'instant', block: 'center' }); } };
    window.showMock = (kind) => { document.querySelector('.video-mock')?.remove(); const mock = document.createElement('div'); mock.className = 'video-mock'; mock.innerHTML = kind === 'pdf' ? '<div style="background:#334155;color:#fff;padding:14px 20px;font-weight:800">Yazdır</div><div style="display:grid;grid-template-columns:1fr 280px;height:calc(100% - 52px)"><div style="background:#cbd5e1;padding:24px;display:flex;justify-content:center"><div style="background:#fff;width:330px;padding:24px;box-shadow:0 4px 12px #0003"><b>T.C. CUMHURBAŞKANLIĞI MAKAMINA</b><hr><p>7527 Sayılı Kanun\'un iptali talebi</p><p style="margin-top:100px">İmza: Örnek Gönüllü</p></div></div><div style="background:#fff;padding:24px"><b>Yazıcı</b><p>PDF olarak kaydet</p><div style="border:1px solid #94a3b8;padding:10px;margin:8px 0">dilekce-7527.pdf</div><button style="background:#2563eb;color:#fff;border:0;border-radius:6px;padding:12px 20px;font-weight:800">KAYDET</button></div></div>' : '<div style="background:#1d4ed8;color:#fff;padding:14px 20px;font-weight:800">Yeni ileti</div><div style="padding:24px;background:#fff;height:calc(100% - 52px)"><p><b>Kime:</b> Cumhurbaşkanlığı</p><p><b>Konu:</b> 7527 Sayılı Kanun İptal Talebi</p><hr><p>Dilekçenizi ekleyip gönderin.</p><div style="display:inline-flex;gap:10px;align-items:center;background:#e2e8f0;padding:12px 16px;border-radius:8px;margin-top:35px">📎 dilekce-7527.pdf</div><br><button style="margin-top:35px;background:#16a34a;color:#fff;border:0;border-radius:6px;padding:12px 24px;font-weight:800">GÖNDER</button></div>'; document.body.appendChild(mock); };
    window.hideMock = () => document.querySelector('.video-mock')?.remove();
  });
  page.on('dialog', (dialog) => dialog.dismiss().catch(() => {}));

  await page.evaluate(() => setVideoCaption('Vatandaş dilekçesi gönderme sırası\n7527 sayılı yasanın iptali için ortak başvuru.'));
  await page.waitForTimeout(4500);
  await page.evaluate(() => { focusVideo('#t-cb'); setVideoCaption('1. Cumhurbaşkanlığı hedefini seçin.'); });
  await page.waitForTimeout(3500); await page.click('#t-cb');
  await page.evaluate(() => { focusVideo('#input-name'); setVideoCaption('2. Bilgilerinizi doldurun.'); });
  await page.fill('#input-name', 'Örnek Gönüllü'); await page.fill('#input-tc', '12345678901'); await page.selectOption('#input-city', { index: 1 }); await page.fill('#input-district', 'Merkez'); await page.fill('#input-address', 'Örnek Mahallesi, Yaşam Sokak No: 1'); await page.fill('#input-contact', 'ornek@gonullu.org'); await page.waitForTimeout(4500);
  await page.evaluate(() => { focusVideo('#signature-pad'); setVideoCaption('3. Islak imzanızı atın.'); });
  const canvas = page.locator('#signature-pad'); const box = await canvas.boundingBox(); await page.mouse.move(box.x + 80, box.y + 55); await page.mouse.down(); await page.mouse.move(box.x + 130, box.y + 35, { steps: 5 }); await page.mouse.move(box.x + 185, box.y + 70, { steps: 5 }); await page.mouse.move(box.x + 235, box.y + 40, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(4000);
  await page.evaluate(() => { focusVideo('#preview-content'); setVideoCaption('4. Dilekçenizi kontrol edin.'); }); await page.waitForTimeout(5500);
  await page.evaluate(() => { window.print = () => window.dispatchEvent(new Event('afterprint')); }); page.on('popup', (popup) => popup.close());
  await page.evaluate(() => { focusVideo('#send-btn'); setVideoCaption('5. Dilekçeyi kontrol et ve gönder düğmesine basın.'); }); await page.waitForTimeout(4000); await page.click('#send-btn');
  await page.evaluate(() => { showMock('pdf'); setVideoCaption('6. PDF kaydetme ekranında dosyayı PDF olarak kaydedin.'); }); await page.waitForTimeout(6500);
  await page.evaluate(() => { hideMock(); showMock('mail'); setVideoCaption('7. Açılan e-postaya PDF dosyasını ekleyip gönderin.'); }); await page.waitForTimeout(7500);
  await page.evaluate(() => { hideMock(); focusVideo('#confirm-modal'); setVideoCaption('8. E-postayı gönderdikten sonra teyit verin.'); }); await page.waitForTimeout(6000);
  await page.evaluate(() => { document.getElementById('confirm-modal').style.display = 'none'; focusVideo('#t-mb'); setVideoCaption('9. TBMM Başkanlığı için de aynı işlemleri (bilgi doldurma, imza, PDF, e-posta, teyit) tekrarlayın.'); }); await page.waitForTimeout(6000); await page.click('#t-mb'); await page.waitForTimeout(3000);
  await page.evaluate(() => { focusVideo('#t-mp'); setVideoCaption('10. Şimdi milletvekiline gönderim adımına geçin.'); }); await page.waitForTimeout(5000); await page.click('#t-mp'); await page.waitForTimeout(2500);
  await page.evaluate(() => { focusVideo('#vekil-radio-list'); setVideoCaption('11. Listeden gönderim yapılacak vekili seçin.'); }); await page.waitForTimeout(4500);
  await page.locator('input[name="selected_mp_radio"]').first().click(); await page.waitForTimeout(3500);
  await page.evaluate(() => { focusVideo('#send-btn'); setVideoCaption('12. Seçtiğiniz vekile de aynı gönderim adımlarını (PDF kaydet, e-postaya ekle, gönder, teyit ver) uygulayarak dilekçenizi iletin.'); }); await page.waitForTimeout(6000);
  await page.evaluate(() => { document.querySelectorAll('.video-focus').forEach((el) => el.classList.remove('video-focus')); setVideoCaption('Adımlar tamamlandı. Her hedef için PDF, e-posta ve teyit sırası korunur.'); }); await page.waitForTimeout(4500);

  await context.close(); const rawVideoPath = await page.video().path(); await browser.close(); execFileSync('ffmpeg', ['-y', '-i', rawVideoPath, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(__dirname, 'campaign-video-output', 'kampanya-7527-iptal.mp4')], { stdio: 'ignore' }); console.log('kampanya-7527-iptal');
})();
