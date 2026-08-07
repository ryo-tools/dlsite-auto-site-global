import fs from 'fs';
import path from 'path';
import { BskyAgent, RichText } from '@atproto/api';

const HANDLE = process.env.BLUESKY_HANDLE;
const PASSWORD = process.env.BLUESKY_PASSWORD;
// グローバル版のASMRカテゴリページURL
const SITE_URL = 'https://dlsite-auto-site-global.pages.dev/asmr/';

async function postToBluesky() {
  if (!HANDLE || !PASSWORD) {
    console.log('Bluesky credentials not found. Skipping post.');
    return;
  }

  const jsonPath = path.join(process.cwd(), 'public', 'data.json');
  if (!fs.existsSync(jsonPath)) {
    console.log('data.json not found. Skipping post.');
    return;
  }

  const items = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  if (!items || items.length === 0) {
    console.log('No items found to post.');
    return;
  }

  // 英語・日本語の両方でASMR・音声作品を絞り込み
  const asmrKeywords = [
    'ASMR', 'Voice', 'Audio', 'Sound', 'Relaxing', 'Sleep', 'Drama',
    'ボイス', '音声', '耳かき', '睡眠', '囁き', '耳攻め', '癒やし', 'バイノーラル', 'シチュエーション'
  ];
  const asmrItems = items.filter(item => 
    asmrKeywords.some(kw => 
      (item.title || '').toUpperCase().includes(kw.toUpperCase()) || 
      (item.maker || '').toUpperCase().includes(kw.toUpperCase()) ||
      (item.workType || '').toUpperCase().includes(kw.toUpperCase())
    )
  );

  const targetPool = asmrItems.length > 0 ? asmrItems : items;

  // 1. 固定連投を防ぐため、対象作品の中からランダム選定
  const randomIndex = Math.floor(Math.random() * targetPool.length);
  const topItem = targetPool[randomIndex];

  const agent = new BskyAgent({ service: 'https://bsky.social' });

  try {
    await agent.login({ identifier: HANDLE, password: PASSWORD });
    console.log('Bluesky login successful.');

    let thumbBlob = undefined;

    // サムネイル画像のアップロード
    if (topItem.image && topItem.image.startsWith('http')) {
      try {
        console.log(`Downloading thumbnail: ${topItem.image}`);
        const response = await fetch(topItem.image, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Referer': 'https://www.dlsite.com/'
          }
        });

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          const uploadRes = await agent.uploadBlob(buffer, {
            encoding: 'image/jpeg'
          });

          thumbBlob = uploadRes.data.blob;
          console.log('Thumbnail uploaded successfully!');
        }
      } catch (imgError) {
        console.error('Image upload failed (continuing with text card):', imgError);
      }
    }

    // 2. 英語のキャッチコピーをランダム選択
    const hooks = [
      '🎧【Recommended ASMR】Perfect Japanese voice work for sleep & relaxation',
      '✨【Trending Work】Popular DLsite ASMR & Voice Drama',
      '🌙【Relaxing Audio】Soothing ear-whispering experience',
      '🔥【Featured DLsite ASMR】Top pick Japanese voice work'
    ];
    const selectedHook = hooks[Math.floor(Math.random() * hooks.length)];

    // タイトルの長さを調整（文字数オーバー防止）
    const displayTitle = topItem.title.length > 50 ? topItem.title.substring(0, 47) + '...' : topItem.title;

    // 本文テキスト構築（英語ベース）
    const rawText = `${selectedHook}\n\n『${displayTitle}』\nCircle: ${topItem.maker}\nPrice: ${topItem.price}\n\n👇 Listen preview & check details here\n${SITE_URL}`;
    
    const rt = new RichText({ text: rawText });
    await rt.detectFacets(agent);

    // 3. 外部リンクカード設定
    const postPayload = {
      text: rt.text,
      facets: rt.facets,
      embed: {
        $type: 'app.bsky.embed.external',
        external: {
          uri: SITE_URL,
          title: `【ASMR】${displayTitle}`,
          description: `Circle: ${topItem.maker} | Price: ${topItem.price} - Recommended DLsite Voice & ASMR Hub`,
          thumb: thumbBlob
        }
      },
      labels: {
        $type: 'com.atproto.label.defs.selfLabels',
        values: [
          { val: 'sexual' }
        ]
      },
      createdAt: new Date().toISOString()
    };

    await agent.post(postPayload);

    console.log(`Bluesky post complete (Global): ${topItem.title}`);
  } catch (error) {
    console.error('Bluesky post error:', error);
  }
}

postToBluesky();