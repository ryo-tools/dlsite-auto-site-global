import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const AFFILIATE_ID = 'yofukashireview';
const DOMAIN = 'https://dlsite-auto-site.pages.dev';

async function fetchDLsiteData() {
  console.log('DLsiteデータ取得開始...');
  
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'ja-JP'
  });

  const page = await context.newPage();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  await context.addCookies([
    { name: 'adultchecked', value: '1', domain: '.dlsite.com', path: '/' },
    { name: 'work_view_option', value: '1', domain: '.dlsite.com', path: '/' }
  ]);

  try {
    console.log('ページへアクセス中...');
    await page.goto('https://www.dlsite.com/maniax/new', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    const items = await page.evaluate((affiliateId) => {
      const list = [];
      const titleLinks = document.querySelectorAll('.work_name a, .work_title a, dt.work_name a');

      titleLinks.forEach(linkEl => {
        const titleText = linkEl.innerText ? linkEl.innerText.trim() : '';
        if (!titleText) return;

        let rawLink = linkEl.getAttribute('href') || '';
        if (!rawLink) return;

        // URL全体からRJ番号を確実に抽出
        const rjMatch = rawLink.match(/(RJ[0-9]+)/i);
        if (!rjMatch) return;

        const rjCode = rjMatch[1].toUpperCase();

        // dlaf.jp 形式のアフィリエイトURLを確定生成
        const finalLink = `https://dlaf.jp/home/dlaf/=/t/s/link/work/aid/${affiliateId}/id/${rjCode}.html`;

        // 画像URL構築
        const digits = rjCode.replace('RJ', '');
        const num = parseInt(digits, 10);
        const rounded = Math.ceil(num / 1000) * 1000;
        const folder = 'RJ' + String(rounded).padStart(digits.length, '0');
        const imgUrl = `https://img.dlsite.jp/modpub/images2/work/doujin/${folder}/${rjCode}_img_main.jpg`;

        const container = linkEl.closest('tr') || linkEl.closest('.work_thumb_box') || linkEl.closest('li') || linkEl.parentElement.parentElement;

        let maker = 'DLsite';
        let price = '価格情報なし';
        let workType = '';

        if (container) {
          const makerEl = container.querySelector('.maker_name a, .author a, .maker a');
          if (makerEl) maker = makerEl.innerText.trim();

          const priceEl = container.querySelector('.price, .work_price, .price_default');
          if (priceEl) price = priceEl.innerText.trim();

          // DLsiteの作品種別タグ/アイコン要素を取得（.work_category, .work_genre, .work_type, アイコン等）
          const typeEl = container.querySelector('.work_category, .work_genre, .work_type, .work_img_icon span, .icon_work_type');
          if (typeEl) workType = typeEl.innerText.trim();
        }

        if (!list.some(i => i.link === finalLink)) {
          list.push({
            title: titleText,
            link: finalLink,
            rawLink: `https://www.dlsite.com/maniax/work/=/product_id/${rjCode}.html`,
            maker: maker,
            image: imgUrl || 'https://www.dlsite.com/images/web/common/no_image/no_image_200x200.gif',
            price: price,
            workType: workType
          });
        }
      });

      return list;
    }, AFFILIATE_ID);

    console.log(`取得成功: ${items.length} 件`);
    return items;
  } catch (error) {
    console.error('データ取得エラー:', error);
    return [];
  } finally {
    await browser.close();
  }
}

// 青系デザインスタイル
const commonStyle = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f5f7fa; color: #333; margin: 0; padding: 0; line-height: 1.5; }
  header { background-color: #ffffff; padding: 20px; text-align: center; border-bottom: 1px solid #e1e8ed; }
  header h1 { margin: 0; font-size: 1.4rem; color: #1c2938; }
  nav.categories { background-color: #2b3846; padding: 10px; text-align: center; flex-wrap: wrap; display: flex; justify-content: center; gap: 15px; }
  nav.categories a { color: #ffffff; text-decoration: none; font-weight: bold; font-size: 0.9rem; }
  nav.categories a:hover { color: #1da1f2; text-decoration: underline; }
  .breadcrumb { max-width: 1200px; margin: 15px auto 0; padding: 0 20px; font-size: 0.85rem; color: #657786; }
  .breadcrumb a { color: #1da1f2; text-decoration: none; }
  .container { max-width: 1200px; margin: 20px auto; padding: 0 20px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
  .card { background: #ffffff; border-radius: 8px; border: 1px solid #e1e8ed; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.15s ease; }
  .card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
  .card-img-wrapper { width: 100%; height: 180px; background-color: #e1e8ed; overflow: hidden; }
  .card img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .card-body { padding: 12px; display: flex; flex-direction: column; flex-grow: 1; }
  .card-title { font-size: 0.9rem; font-weight: bold; margin: 0 0 6px 0; line-height: 1.35; height: 2.7em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; color: #1c2938; }
  .card-maker { font-size: 0.8rem; color: #657786; margin-bottom: 8px; }
  .card-price { font-size: 0.95rem; color: #e63946; font-weight: bold; margin-top: auto; margin-bottom: 10px; }
  .btn { display: block; text-align: center; background-color: #1da1f2; color: #ffffff; text-decoration: none; padding: 8px 0; border-radius: 4px; font-weight: bold; font-size: 0.85rem; }
  .btn:hover { background-color: #0c85d0; }
  footer { text-align: center; padding: 20px; background: #ffffff; color: #657786; margin-top: 40px; border-top: 1px solid #e1e8ed; font-size: 0.85rem; }
  footer a { color: #1da1f2; text-decoration: none; margin: 0 10px; }
`;

function generateHTML(title, description, items, breadcrumbs) {
  const breadcrumbHTML = breadcrumbs.map((b, i) => 
    i === breadcrumbs.length - 1 ? `<span>${b.name}</span>` : `<a href="${b.path}">${b.name}</a> &gt; `
  ).join('');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="referrer" content="no-referrer">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <style>${commonStyle}</style>
</head>
<body>
  <header>
    <h1>${title}</h1>
  </header>
  <nav class="categories">
    <a href="/">総合最新</a>
    <a href="/asmr/">音声・ASMR</a>
    <a href="/manga/">マンガ・コミック</a>
    <a href="/game/">ゲーム作品</a>
    <a href="/cg/">CG集・イラスト</a>
  </nav>

  <div class="breadcrumb">
    ${breadcrumbHTML}
  </div>

  <div class="container">
    <div class="grid">
      ${items.map(item => `
        <div class="card">
          <div class="card-img-wrapper">
            <img src="${item.image}" alt="${item.title}" loading="lazy" referrerpolicy="no-referrer">
          </div>
          <div class="card-body">
            <div class="card-title">${item.title}</div>
            <div class="card-maker">${item.maker}</div>
            <div class="card-price">${item.price}</div>
            <a href="${item.link}" class="btn" target="_blank" rel="noopener noreferrer">DLsiteで見る</a>
          </div>
        </div>
      `).join('')}
    </div>
  </div>

  <footer>
    <p>
      <a href="/">トップページ</a> | 
      <a href="/asmr/">音声・ASMR</a> | 
      <a href="/manga/">マンガ</a> | 
      <a href="/game/">ゲーム</a> | 
      <a href="/cg/">CG集</a>
    </p>
    <p>&copy; 2026 DLsiteおすすめ作品まとめ</p>
  </footer>
</body>
</html>`;
}

async function main() {
  const items = await fetchDLsiteData();

  if (items.length === 0) {
    console.log('データが取得できなかったためビルドを中断します。');
    return;
  }

  const publicDir = path.join(process.cwd(), 'public');
  const asmrDir = path.join(publicDir, 'asmr');
  const mangaDir = path.join(publicDir, 'manga');
  const gameDir = path.join(publicDir, 'game');
  const cgDir = path.join(publicDir, 'cg');

  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  if (!fs.existsSync(asmrDir)) fs.mkdirSync(asmrDir, { recursive: true });
  if (!fs.existsSync(mangaDir)) fs.mkdirSync(mangaDir, { recursive: true });
  if (!fs.existsSync(gameDir)) fs.mkdirSync(gameDir, { recursive: true });
  if (!fs.existsSync(cgDir)) fs.mkdirSync(cgDir, { recursive: true });

  // 1. トップページ（総合）
  const topHTML = generateHTML(
    'DLsiteおすすめ作品まとめ | 毎日更新ナビ',
    'DLsiteの最新人気作品を毎日自動更新でお届けします。全ジャンルの注目作品をチェック！',
    items,
    [{ name: 'ホーム', path: '/' }]
  );
  fs.writeFileSync(path.join(publicDir, 'index.html'), topHTML);

  // 2. 音声・ASMR特化（DLsite公式形式：ボイス・ASMR, ボイス, 音楽, 朗読等）
  const asmrKeywords = ['ボイス・ASMR', 'ボイス', 'ASMR', '音声', '耳かき', '睡眠', '囁き', '耳攻め', '癒やし', 'バイノーラル', '朗読', 'ドラマ', 'シチュエーション', 'ボイスドラマ', '音楽'];
  const asmrItems = items.filter(item => 
    asmrKeywords.some(kw => item.title.includes(kw) || item.maker.includes(kw) || item.workType.includes(kw))
  );
  const asmrHTML = generateHTML(
    'DLsite 音声・ASMRおすすめまとめ | 毎日更新ナビ',
    'DLsiteで人気のASMR・同人音声作品を厳選してお届け。安眠系・耳かき・シチュエーションボイスなど最新作品を毎日更新！',
    asmrItems.length > 0 ? asmrItems : items,
    [{ name: 'ホーム', path: '/' }, { name: '音声・ASMR特化', path: '/asmr/' }]
  );
  fs.writeFileSync(path.join(asmrDir, 'index.html'), asmrHTML);

  // 3. マンガ・コミック特化（DLsite公式形式：マンガ, コミック, 劇画等）
  const mangaKeywords = ['マンガ', 'コミック', '漫画', '同人誌', '単行本', '総集編', '劇画', 'フルカラー', 'カラー', '描き下ろし'];
  const mangaItems = items.filter(item => 
    mangaKeywords.some(kw => item.title.includes(kw) || item.maker.includes(kw) || item.workType.includes(kw))
  );
  const mangaHTML = generateHTML(
    'DLsite 同人マンガおすすめまとめ | 毎日更新ナビ',
    'DLsiteで人気の同人マンガ・コミック作品を厳選してお届け。話題の新作コミックを毎日更新！',
    mangaItems.length > 0 ? mangaItems : items,
    [{ name: 'ホーム', path: '/' }, { name: 'マンガ・コミック', path: '/manga/' }]
  );
  fs.writeFileSync(path.join(mangaDir, 'index.html'), mangaHTML);

  // 4. ゲーム特化（DLsite公式形式：ゲーム, ロールプレイング, アクション, アドベンチャー等）
  const gameKeywords = ['ゲーム', 'ロールプレイング', 'アクション', 'アドベンチャー', 'シミュレーション', 'RPG', 'ACT', 'SLG', 'ADV', 'ノベル', '体験版', 'STG', 'パズル', 'ハクスラ', '3D', '2D', 'ダンジョン', '脱出', '育成', '同人ゲーム'];
  const gameItems = items.filter(item => 
    gameKeywords.some(kw => item.title.includes(kw) || item.maker.includes(kw) || item.workType.includes(kw))
  );
  const gameHTML = generateHTML(
    'DLsite 同人ゲームおすすめまとめ | 毎日更新ナビ',
    'DLsiteで人気の同人ゲーム・長編RPG・アクション作品を厳選してお届け。話題の新作ゲームを毎日更新！',
    gameItems.length > 0 ? gameItems : items,
    [{ name: 'ホーム', path: '/' }, { name: 'ゲーム作品', path: '/game/' }]
  );
  fs.writeFileSync(path.join(gameDir, 'index.html'), gameHTML);

  // 5. CG集・イラスト特化（DLsite公式形式：CG・イラスト, CG集等）
  const cgKeywords = ['CG・イラスト', 'CG集', 'CG', 'イラスト', '画集', '原画集', '立ち絵', '素材', '差分'];
  const cgItems = items.filter(item => 
    cgKeywords.some(kw => item.title.includes(kw) || item.maker.includes(kw) || item.workType.includes(kw))
  );
  const cgHTML = generateHTML(
    'DLsite CG集・イラストおすすめまとめ | 毎日更新ナビ',
    'DLsiteで人気のCG集・イラスト・画像作品を厳選してお届け。高画質CG集の新作を毎日更新！',
    cgItems.length > 0 ? cgItems : items,
    [{ name: 'ホーム', path: '/' }, { name: 'CG集・イラスト', path: '/cg/' }]
  );
  fs.writeFileSync(path.join(cgDir, 'index.html'), cgHTML);

  // 6. SEO用 sitemap.xml & robots.txt
  const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${DOMAIN}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${DOMAIN}/asmr/</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${DOMAIN}/manga/</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${DOMAIN}/game/</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${DOMAIN}/cg/</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXML);

  const robotsTxt = `User-agent: *
Allow: /
Sitemap: ${DOMAIN}/sitemap.xml`;
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt);

  // 最新データをJSONとしても保存
  fs.writeFileSync(path.join(publicDir, 'data.json'), JSON.stringify(items, null, 2));

  console.log('ビルド完了: DLsite公式形式名対応でカテゴリ振り分け精度を向上。');
}

main();