import fs from 'fs';
import path from 'path';

async function sendDiscordNotification() {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('DISCORD_WEBHOOK_URL が設定されていません。');
    process.exit(1);
  }

  const dataPath = path.join(process.cwd(), 'public', 'data.json');
  if (!fs.existsSync(dataPath)) {
    console.error('public/data.json が見つかりません。');
    process.exit(0);
  }

  try {
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const items = JSON.parse(rawData);

    if (!items || items.length === 0) {
      console.log('通知対象のデータが存在しません。');
      process.exit(0);
    }

    // 先頭の1件（最新作品）をピックアップ
    const item = items[0];

    // ジャンルに応じたハッシュタグの設定
    let hashtag = '#DLsite';
    if (item.workType.includes('ボイス') || item.workType.includes('ASMR')) {
      hashtag += ' #ASMR #音声作品';
    } else if (item.workType.includes('マンガ') || item.workType.includes('コミック')) {
      hashtag += ' #同人誌 #マンガ';
    } else if (item.workType.includes('ゲーム')) {
      hashtag += ' #同人ゲーム';
    }

    const title = "【X予約投稿用ストック】";
    const body = `${item.title}\nサークル: ${item.maker} (${item.price})\n\nおすすめの注目作品をピックアップ！夜のお供にぜひチェックしてみてください。🎧\n\n${hashtag}\n👇作品の詳細・レビューはリプライ欄へ`;
    const replyUrl = item.link;
    const imageUrl = item.image;

    const payload = {
      content: `${title}\n\n**■ 親ツイート用（コピペ）**\n${body}\n\n-------------------\n**■ リプライ用URL**\n${replyUrl}`,
      embeds: [
        {
          title: item.title,
          image: {
            url: imageUrl
          }
        }
      ]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('Discord送信失敗:', response.statusText);
    } else {
      console.log('画像付きでDiscordへの通知が完了しました！');
    }
  } catch (error) {
    console.error('Discord通知エラー:', error);
  }
}

sendDiscordNotification();