const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: path.join(__dirname, 'campaign-video-output'), size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  await page.goto(`file://${path.join(__dirname, 'index.html')}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  await page.evaluate(() => {
    const style = document.createElement('style');
    style.textContent = `
      #video-caption { position:fixed; z-index:9999; left:50%; bottom:24px; transform:translateX(-50%); padding:14px 24px; border:2px solid #ef4444; border-radius:8px; background:rgba(9,9,11,.94); color:#fff; font:800 22px Inter,sans-serif; letter-spacing:.02em; text-align:center; box-shadow:0 8px 30px rgba(0,0,0,.5); }
      .video-focus { outline:4px solid #facc15 !important; outline-offset:5px; transition:outline .2s; }
    `;
    document.head.appendChild(style);
    const caption = document.createElement('div');
    caption.id = 'video-caption';
    document.body.appendChild(caption);
    window.setVideoCaption = (text) => { caption.textContent = text; };
    window.focusVideo = (selector) => { document.querySelectorAll('.video-focus').forEach((el) => el.classList.remove('video-focus')); const el = document.querySelector(selector); if (el) { el.classList.add('video-focus'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } };
  });

  await page.evaluate(() => { setVideoCaption('Her gün yeni acılar yaşanırken artık beklemiyoruz.\nTalebimiz açık: 7527 sayılı yasa geri çekilsin.'); });
  await page.waitForTimeout(5000);
  await page.evaluate(() => { setVideoCaption('Sahadaki tanıklıklar, ağır yaralanmalar ve ölümler araştırılsın.\nYaşam hakkı her yerde ve her can için güvence altına alınsın.'); });
  await page.waitForTimeout(5000);
  await page.evaluate(() => { setVideoCaption('Bu kararın alınmasında ve uygulanmasında sorumluluğu olanlara çağrımızdır:\nKararı gözden geçirin, geri adım atın, yaşamı savunun.'); });
  await page.waitForTimeout(5000);
  await page.evaluate(() => { setVideoCaption('Parçalanmadan, birbirimizi tüketmeden ortak talepte buluşalım.\nMücadelemiz kişilere değil, yaşam hakkını yok sayan karara karşıdır.'); });
  await page.waitForTimeout(5000);
  await page.evaluate(() => { focusVideo('#t-cb'); setVideoCaption('1. Hedefini seç: Cumhurbaşkanlığı, TBMM veya milletvekili'); });
  await page.waitForTimeout(4000);
  await page.click('#t-cb');
  await page.evaluate(() => { focusVideo('#input-name'); setVideoCaption('2. Bilgilerini doldur ve dilekçeni kişiselleştir'); });
  await page.fill('#input-name', 'Örnek Gönüllü');
  await page.fill('#input-tc', '12345678901');
  await page.selectOption('#input-city', { index: 1 });
  await page.fill('#input-district', 'Merkez');
  await page.fill('#input-address', 'Örnek Mahallesi, Yaşam Sokak No: 1');
  await page.fill('#input-contact', 'ornek@gonullu.org');
  await page.waitForTimeout(5000);
  await page.evaluate(() => { focusVideo('#signature-pad'); setVideoCaption('3. Islak imzanı ekle'); });
  const canvas = page.locator('#signature-pad');
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + 90, box.y + 55);
  await page.mouse.down();
  await page.mouse.move(box.x + 130, box.y + 35, { steps: 5 });
  await page.mouse.move(box.x + 170, box.y + 70, { steps: 5 });
  await page.mouse.move(box.x + 220, box.y + 40, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(4000);
  await page.evaluate(() => { focusVideo('#preview-content'); setVideoCaption('4. Dilekçedeki bilgilerini kontrol et.'); });
  await page.waitForTimeout(5000);
  await page.evaluate(() => { focusVideo('#send-btn'); setVideoCaption('5. Dilekçeyi kontrol et ve gönder.'); });
  await page.waitForTimeout(4500);
  await page.evaluate(() => {
    window.print = () => window.dispatchEvent(new Event('afterprint'));
  });
  await page.click('#send-btn');
  await page.evaluate(() => { setVideoCaption('PDF yazdırma ekranında PDF olarak kaydet.'); });
  await page.waitForTimeout(5000);
  await page.evaluate(() => { setVideoCaption('Açılan e-postaya kaydettiğin PDF dosyasını ekle ve gönder.'); });
  await page.waitForTimeout(6500);
  await page.evaluate(() => { focusVideo('#confirm-modal'); setVideoCaption('Gönderdiysen onay ver; sayaç bu teyitten sonra güncellenir.'); });
  await page.waitForTimeout(5500);
  await page.evaluate(() => { document.getElementById('confirm-modal').style.display = 'none'; });
  await page.evaluate(() => { focusVideo('#t-mb'); setVideoCaption('6. Aynı işlemi TBMM Başkanlığı için de yap.'); });
  await page.waitForTimeout(4500);
  await page.click('#t-mb');
  await page.waitForTimeout(2500);
  await page.evaluate(() => { focusVideo('#preview-content'); setVideoCaption('TBMM Başkanlığı dilekçeni de kontrol et.'); });
  await page.waitForTimeout(4500);
  await page.evaluate(() => { setVideoCaption('Dilekçeyi kontrol et ve gönderimi tamamla.'); });
  await page.waitForTimeout(5000);
  await page.evaluate(() => { focusVideo('#t-mp'); setVideoCaption('9. Şimdi seçtiğin milletvekillerine aynı gönderim adımlarını uygula.'); });
  await page.waitForTimeout(4000);
  await page.click('#t-mp');
  await page.waitForTimeout(2500);
  await page.evaluate(() => { focusVideo('#vekil-radio-list'); setVideoCaption('Milletvekili seç: Her seçilen vekile ayrı dilekçe gönderilebilir.'); });
  await page.waitForTimeout(4000);
  await page.locator('input[name="selected_mp_radio"]').first().check();
  await page.waitForTimeout(3500);
  await page.evaluate(() => { focusVideo('#preview-content'); setVideoCaption('Seçilen vekilin dilekçesini kontrol et, PDF ekleyerek gönder.'); });
  await page.waitForTimeout(5000);
  await page.evaluate(() => { focusVideo('#almanac-container'); setVideoCaption('Almanak: vakayı incele, seçili vekile e-posta ile gönder veya sosyal medyada paylaş.'); });
  await page.waitForTimeout(6500);
  await page.locator('#almanac-container button').filter({ hasText: 'Sosyal paylaş' }).first().scrollIntoViewIfNeeded();
  await page.locator('#almanac-container button').filter({ hasText: 'Sosyal paylaş' }).first().evaluate((button) => {
    document.querySelectorAll('.video-focus').forEach((el) => el.classList.remove('video-focus'));
    button.classList.add('video-focus');
  });
  await page.evaluate(() => { setVideoCaption('Almanak paylaşımı: vakayı sosyal medyada yayınla.'); });
  await page.waitForTimeout(6500);
  await page.evaluate(() => { focusVideo('#tab-vekil'); setVideoCaption('Milletvekilleri: panelden adınızı ve imzanızı ekleyin.'); });
  await page.waitForTimeout(4000);
  await page.click('#tab-vekil');
  await page.evaluate(() => { focusVideo('#mp-search-input'); setVideoCaption('Milletvekili panelinde adınızı arayın ve seçin.'); });
  await page.fill('#mp-search-input', 'Ahmet');
  await page.waitForTimeout(4000);
  await page.selectOption('#mp-select', { index: 0 });
  await page.evaluate(() => { focusVideo('#mp-signature-pad'); setVideoCaption('Islak imzanızı atın ve Meclise sunun.'); });
  await page.waitForTimeout(5000);
  await page.evaluate(() => { document.querySelectorAll('.video-focus').forEach((el) => el.classList.remove('video-focus')); setVideoCaption('7527 İPTAL! İMZACISI OL!\nİmza sahiplerine çağrı: Bu kararı geri çekin.'); });
  await page.waitForTimeout(3000);
  await context.close();
  const rawVideoPath = await page.video().path();
  await browser.close();
  execFileSync('ffmpeg', ['-y', '-i', rawVideoPath, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(__dirname, 'campaign-video-output', 'kampanya-7527-iptal.mp4')], { stdio: 'ignore' });
})();
