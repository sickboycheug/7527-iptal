const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');

const mode = process.argv[2] || 'citizen';
const outputName = mode === 'vekil' ? 'vekil-7527-iptal' : 'vatandas-7527-iptal';

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
    style.textContent = '#video-caption{position:fixed;z-index:9999;left:50%;bottom:24px;transform:translateX(-50%);padding:14px 24px;border:2px solid #facc15;border-radius:8px;background:rgba(9,9,11,.96);color:#fff;font:800 22px Inter,sans-serif;text-align:center;white-space:pre-line;box-shadow:0 8px 30px rgba(0,0,0,.5)}.video-focus{outline:5px solid #facc15!important;outline-offset:6px;box-shadow:0 0 0 10px rgba(250,204,21,.18)!important}';
    document.head.appendChild(style);
    const caption = document.createElement('div');
    caption.id = 'video-caption';
    document.body.appendChild(caption);
    window.setVideoCaption = (text) => { caption.textContent = text; };
    window.focusVideo = (selector) => { document.querySelectorAll('.video-focus').forEach((el) => el.classList.remove('video-focus')); const el = document.querySelector(selector); if (el) { el.classList.add('video-focus'); el.scrollIntoView({ behavior: 'instant', block: 'center' }); } };
  });

  if (mode === 'vekil') {
    await page.evaluate(() => { switchTab('vekil'); setVideoCaption('Meclis Vekil Paneli\nVekil imzası için üç adım.'); });
    await page.waitForTimeout(4500);
    await page.evaluate(() => { focusVideo('#mp-search-input'); setVideoCaption('1. Kendi adınızı arayın ve listeden seçin.'); });
    await page.fill('#mp-search-input', 'Ahmet');
    await page.waitForTimeout(4500);
    await page.selectOption('#mp-select', { index: 0 });
    await page.evaluate(() => { focusVideo('#mp-selected-info'); setVideoCaption('2. Seçiminizi kontrol edin.'); });
    await page.waitForTimeout(3500);
    await page.evaluate(() => { focusVideo('#mp-signature-pad'); setVideoCaption('3. Islak imzanızı atın.'); });
    const canvas = page.locator('#mp-signature-pad');
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + 80, box.y + 55);
    await page.mouse.down();
    await page.mouse.move(box.x + 130, box.y + 35, { steps: 5 });
    await page.mouse.move(box.x + 185, box.y + 70, { steps: 5 });
    await page.mouse.move(box.x + 235, box.y + 40, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(4500);
    await page.evaluate(() => { setVideoCaption('İmzanızı tamamlayın ve imzayı kaydedin.'); });
    await page.waitForTimeout(5000);
    await page.evaluate(() => { document.querySelectorAll('.video-focus').forEach((el) => el.classList.remove('video-focus')); setVideoCaption('Milletvekili imzası, yaşam hakkını savunan ortak talebin Mecliste görünür olmasıdır.'); });
    await page.waitForTimeout(4500);
  } else {
    await page.evaluate(() => { setVideoCaption('Vatandaş dilekçesi gönderme sırası\n7527 sayılı yasanın iptali için ortak başvuru.'); });
    await page.waitForTimeout(4500);
    await page.evaluate(() => { focusVideo('#t-cb'); setVideoCaption('1. Önce Cumhurbaşkanlığı kutucuğunu seçin.'); });
    await page.waitForTimeout(3500);
    await page.click('#t-cb');
    await page.evaluate(() => { focusVideo('#input-name'); setVideoCaption('2. Bilgilerinizi doldurun.'); });
    await page.fill('#input-name', 'Örnek Gönüllü');
    await page.fill('#input-tc', '12345678901');
    await page.selectOption('#input-city', { index: 1 });
    await page.fill('#input-district', 'Merkez');
    await page.fill('#input-address', 'Örnek Mahallesi, Yaşam Sokak No: 1');
    await page.fill('#input-contact', 'ornek@gonullu.org');
    await page.waitForTimeout(4500);
    await page.evaluate(() => { focusVideo('#signature-pad'); setVideoCaption('3. Islak imzanızı ekleyin.'); });
    const canvas = page.locator('#signature-pad');
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + 80, box.y + 55);
    await page.mouse.down();
    await page.mouse.move(box.x + 130, box.y + 35, { steps: 5 });
    await page.mouse.move(box.x + 185, box.y + 70, { steps: 5 });
    await page.mouse.move(box.x + 235, box.y + 40, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(4000);
    await page.evaluate(() => { focusVideo('#preview-content'); setVideoCaption('4. Dilekçeyi kontrol edin.'); });
    await page.waitForTimeout(6000);
    await page.evaluate(() => {
      window.print = () => window.dispatchEvent(new Event('afterprint'));
    });
    page.on('popup', (popup) => popup.close());
    await page.evaluate(() => { focusVideo('#send-btn'); setVideoCaption('5. Dilekçeyi kontrol et ve gönder düğmesine basın.'); });
    await page.waitForTimeout(4500);
    await page.click('#send-btn');
    await page.evaluate(() => { setVideoCaption('6. PDF olarak kaydedin; açılan e-postaya PDF dosyasını ekleyip gönderin.'); });
    await page.waitForTimeout(7500);
    await page.evaluate(() => { focusVideo('#confirm-modal'); setVideoCaption('7. E-postayı gönderdiyseniz gönderim teyidini verin.'); });
    await page.waitForTimeout(6500);
    await page.evaluate(() => { document.getElementById('confirm-modal').style.display = 'none'; });
    await page.evaluate(() => { focusVideo('#t-mb'); setVideoCaption('8. Aynı işlemi TBMM Başkanlığı için de tekrarlayın.'); });
    await page.waitForTimeout(4500);
    await page.click('#t-mb');
    await page.waitForTimeout(2500);
    await page.evaluate(() => { focusVideo('#preview-content'); setVideoCaption('TBMM dilekçesini de kontrol edin ve gönderin.'); });
    await page.waitForTimeout(5000);
    await page.evaluate(() => { setVideoCaption('PDF olarak kaydedin, e-postaya ekleyin ve gönderim teyidini verin.'); });
    await page.waitForTimeout(4500);
    await page.evaluate(() => { document.querySelectorAll('.video-focus').forEach((el) => el.classList.remove('video-focus')); setVideoCaption('CB ve TBMM için birer gönderim yeterlidir.\nMilletvekilleri için seçtiğiniz her vekile ayrı dilekçe gönderebilirsiniz.'); });
    await page.waitForTimeout(5000);
  }

  await context.close();
  const rawVideoPath = await page.video().path();
  await browser.close();
  execFileSync('ffmpeg', ['-y', '-i', rawVideoPath, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(__dirname, 'campaign-video-output', `${outputName}.mp4`)], { stdio: 'ignore' });
  console.log(outputName);
})();
