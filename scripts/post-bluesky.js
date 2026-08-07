import fs from 'fs';
import path from 'path';
import { BskyAgent, RichText } from '@atproto/api';

const HANDLE = process.env.BLUESKY_HANDLE;
const PASSWORD = process.env.BLUESKY_PASSWORD;
const SITE_URL = 'https://dlsite-auto-site.pages.dev/asmr/';

async function postToBluesky() {
  if (!HANDLE || !PASSWORD) {
    console.log('Blueskyのログイン情報が未設定のため投稿をスキップします。');
    return;
  }

  const jsonPath = path.join(process.cwd(), 'public', 'data.json');
  if (!fs.existsSync(jsonPath)) {
    console.log('data.json が見つからないため投稿をスキップします。');
    return;
  }

  const items = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  if (!items || items.length === 0) {
    console.log('投稿対象の作品データがありません。');
    return;
  }

  // ASMR・音声作品に絞り込み
  const asmrKeywords = ['ASMR', '音声', 'ボイス', '耳かき', '睡眠', '囁き', '耳攻め', '癒やし', 'バイノーラル', 'シチュエーション'];
  const asmrItems = items.filter(item => 
    asmrKeywords.some(kw => item.title.includes(kw) || item.maker.includes(kw))
  );

  const targetPool = asmrItems.length > 0 ? asmrItems : items;

  // 1. 固定連投を防ぐため、対象作品の中からランダム選定
  const randomIndex = Math.floor(Math.random() * targetPool.length);
  const topItem = targetPool[randomIndex];

  const agent = new BskyAgent({ service: 'https://bsky.social' });

  try {
    await agent.login({ identifier: HANDLE, password: PASSWORD });
    console.log('Blueskyログイン成功');

    let thumbBlob = undefined;

    // サムネイル画像のアップロード
    if (topItem.image && topItem.image.startsWith('http')) {
      try {
        console.log(`画像をダウンロード中: ${topItem.image}`);
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
          console.log('サムネイル画像のアップロード成功！');
        }
      } catch (imgError) {
        console.error('画像アップロードに失敗（テキストカードのみで続行します）:', imgError);
      }
    }

    // 2. クリック率を高めるキャッチコピーのランダム付与
    const hooks = [
      '🎧【おすすめASMR】今夜の安眠・作業用に',
      '✨【注目作品】話題のDLsite音声・ASMR',
      '🌙【耳元ボイス】極上の癒やし体験ピックアップ',
      '🔥【最新セール・新作】おすすめ同人ASMR'
    ];
    const selectedHook = hooks[Math.floor(Math.random() * hooks.length)];

    // タイトルの長さを調整（文字数オーバー防止）
    const displayTitle = topItem.title.length > 40 ? topItem.title.substring(0, 37) + '...' : topItem.title;

    // 本文テキスト構築（自サイトへ誘導）
    const rawText = `${selectedHook}\n\n『${displayTitle}』\nサークル：${topItem.maker}\n価格：${topItem.price}\n\n👇試聴・詳細・作品一覧はこちら\n${SITE_URL}`;
    
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
          description: `サークル: ${topItem.maker} | 価格: ${topItem.price} - DLsiteおすすめASMR・同人音声まとめ`,
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

    console.log(`BlueskyへのASMR作品投稿完了: ${topItem.title}`);
  } catch (error) {
    console.error('Bluesky投稿エラー:', error);
  }
}

postToBluesky();