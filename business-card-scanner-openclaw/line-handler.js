/**
 * Business Card Scanner - OpenClaw LINE Handler
 * LINE → OpenClaw → GAS → OCR/Sheets → LINE返信
 */

const axios = require('axios');
const crypto = require('crypto');

// 設定
const CONFIG = {
  // GAS Webhook URL
  GAS_WEBHOOK_URL: process.env.BUSINESS_CARD_GAS_URL || 'YOUR_GAS_URL',
  
  // LINE設定
  LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET,
  
  // 画像取得用Content API
  LINE_CONTENT_API: 'https://api-data.line.me/v2/bot/message',
  
  // 返信API
  LINE_REPLY_API: 'https://api.line.me/v2/bot/message/reply',
  LINE_PUSH_API: 'https://api.line.me/v2/bot/message/push'
};

/**
 * LINE Webhookハンドラ - メインエントリーポイント
 * OpenClawから呼び出される
 */
async function handleLineWebhook(req, res) {
  const signature = req.headers['x-line-signature'];
  const body = req.body;
  
  // 署名検証
  if (!verifySignature(body, signature)) {
    console.error('Invalid LINE signature');
    return res.status(401).send('Unauthorized');
  }
  
  // イベント処理
  const events = body.events || [];
  
  for (const event of events) {
    try {
      await handleEvent(event);
    } catch (error) {
      console.error('Event handling error:', error);
      // 個別イベントのエラーは無視して次へ
    }
  }
  
  // LINEは200 OKを期待
  res.status(200).send('OK');
}

/**
 * LINE署名検証
 */
function verifySignature(body, signature) {
  if (!CONFIG.LINE_CHANNEL_SECRET) {
    console.warn('LINE_CHANNEL_SECRET not set, skipping verification');
    return true; // 開発時のみ
  }
  
  const hash = crypto
    .createHmac('sha256', CONFIG.LINE_CHANNEL_SECRET)
    .update(body, 'utf8')
    .digest('base64');
  
  return signature === hash;
}

/**
 * イベント別ハンドラ
 */
async function handleEvent(event) {
  // 画像メッセージのみ処理
  if (event.type === 'message' && event.message.type === 'image') {
    await handleImageMessage(event);
  }
  // フォローイベント（友達追加）
  else if (event.type === 'follow') {
    await sendWelcomeMessage(event.source.userId);
  }
  // テキストメッセージ（ヘルプ）
  else if (event.type === 'message' && event.message.type === 'text') {
    const text = event.message.text;
    if (text.includes('ヘルプ') || text.includes('help')) {
      await replyText(event.replyToken, 
        '名刺画像を送信すると、自動で文字認識してデータ化します。\n画像を添付して送信してください。');
    }
  }
}

/**
 * 画像メッセージ処理 - メイン処理
 */
async function handleImageMessage(event) {
  const messageId = event.message.id;
  const replyToken = event.replyToken;
  const userId = event.source.userId;
  
  try {
    // 1. 処理中メッセージ
    await replyText(replyToken, '⏳ 名刺を処理中です...');
    
    // 2. 画像を取得
    const imageBuffer = await downloadLineImage(messageId);
    
    // 3. GASに送信してOCR処理
    const result = await processWithGAS(imageBuffer, messageId, userId);
    
    if (!result.success) {
      throw new Error(result.error || 'GAS processing failed');
    }
    
    // 4. 結果をLINEに返信
    await sendResultToLine(userId, result.data);
    
    console.log(`Processed business card for user ${userId}`);
    
  } catch (error) {
    console.error('Image processing error:', error);
    await pushText(userId, `❌ エラーが発生しました:\n${error.message}`);
  }
}

/**
 * LINE画像をダウンロード
 */
async function downloadLineImage(messageId) {
  const url = `${CONFIG.LINE_CONTENT_API}/${messageId}/content`;
  
  const response = await axios.get(url, {
    headers: {
      'Authorization': `Bearer ${CONFIG.LINE_CHANNEL_ACCESS_TOKEN}`
    },
    responseType: 'arraybuffer',
    timeout: 30000
  });
  
  return Buffer.from(response.data);
}

/**
 * GASに画像を送信して処理
 */
async function processWithGAS(imageBuffer, messageId, userId) {
  if (!CONFIG.GAS_WEBHOOK_URL || CONFIG.GAS_WEBHOOK_URL.includes('YOUR_GAS')) {
    throw new Error('GAS_WEBHOOK_URLが設定されていません');
  }
  
  // Base64エンコード
  const base64Image = imageBuffer.toString('base64');
  
  const payload = {
    source: 'line-openclaw',
    imageData: base64Image,
    messageId: messageId,
    userId: userId,
    timestamp: new Date().toISOString()
  };
  
  const response = await axios.post(CONFIG.GAS_WEBHOOK_URL, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 60000 // OCRに時間がかかる場合あり
  });
  
  return {
    success: response.data.status === 200,
    data: response.data.data,
    error: response.data.message
  };
}

/**
 * 結果をLINEに送信（Flex Message）
 */
async function sendResultToLine(userId, data) {
  const flexMessage = {
    type: 'flex',
    altText: '名刺を登録しました',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '✅ 名刺を登録しました',
            weight: 'bold',
            size: 'lg',
            color: '#00b900'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          createFlexRow('氏名', data.name),
          createFlexRow('会社名', data.company),
          createFlexRow('部署', data.department),
          createFlexRow('役職', data.title),
          createFlexRow('TEL', data.tel || data.mobile),
          createFlexRow('メール', data.email),
          {
            type: 'separator',
            margin: 'md'
          },
          {
            type: 'text',
            text: `スプレッドシート: 行 ${data.row}`,
            size: 'xs',
            color: '#888888',
            margin: 'md'
          }
        ]
      }
    }
  };
  
  await pushMessage(userId, flexMessage);
}

/**
 * Flex Message用の行作成
 */
function createFlexRow(label, value) {
  return {
    type: 'box',
    layout: 'horizontal',
    margin: 'md',
    contents: [
      {
        type: 'text',
        text: `${label}:`,
        size: 'sm',
        color: '#555555',
        flex: 2
      },
      {
        type: 'text',
        text: value || '（未検出）',
        size: 'sm',
        color: '#111111',
        flex: 5,
        wrap: true
      }
    ]
  };
}

/**
 * テキスト返信（replyToken使用）
 */
async function replyText(replyToken, text) {
  return replyMessage(replyToken, {
    type: 'text',
    text: text
  });
}

/**
 * メッセージ返信
 */
async function replyMessage(replyToken, message) {
  await axios.post(CONFIG.LINE_REPLY_API, {
    replyToken: replyToken,
    messages: [message]
  }, {
    headers: {
      'Authorization': `Bearer ${CONFIG.LINE_CHANNEL_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
}

/**
 * テキスト送信（push）
 */
async function pushText(userId, text) {
  return pushMessage(userId, {
    type: 'text',
    text: text
  });
}

/**
 * メッセージ送信（push）
 */
async function pushMessage(userId, message) {
  await axios.post(CONFIG.LINE_PUSH_API, {
    to: userId,
    messages: [message]
  }, {
    headers: {
      'Authorization': `Bearer ${CONFIG.LINE_CHANNEL_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
}

/**
 * ウェルカムメッセージ
 */
async function sendWelcomeMessage(userId) {
  await pushText(userId, 
    '友達追加ありがとうございます！\n\n名刺画像を送信すると、自動で文字認識してスプレッドシートに保存します。\n\n「ヘルプ」と送信すると使い方を表示します。');
}

module.exports = {
  handleLineWebhook,
  
  // 設定取得（検証用）
  getConfig: () => ({
    gasConfigured: !CONFIG.GAS_WEBHOOK_URL.includes('YOUR_GAS'),
    lineTokenConfigured: !!CONFIG.LINE_CHANNEL_ACCESS_TOKEN,
    lineSecretConfigured: !!CONFIG.LINE_CHANNEL_SECRET
  })
};
