/**
 * 名刺デジタル化システム - LINE対応版
 * Discord/LINE両対応の統合コード
 */

// ===== 設定項目 =====
const CONFIG = {
  // Google系
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID',
  SHEET_NAME: '名刺データ',
  FOLDER_ID: 'YOUR_FOLDER_ID',
  VISION_API_KEY: 'YOUR_VISION_API_KEY',
  
  // Discord通知用（任意）
  DISCORD_WEBHOOK_URL: 'YOUR_DISCORD_WEBHOOK_URL',
  
  // LINE用（LINE連携時に設定）
  LINE_CHANNEL_ACCESS_TOKEN: 'YOUR_LINE_CHANNEL_ACCESS_TOKEN',
  LINE_CHANNEL_SECRET: 'YOUR_LINE_CHANNEL_SECRET'
};

/**
 * POST受信ハンドラ（Discord/LINE/OpenClaw経由両対応）
 */
function doPost(e) {
  try {
    // リクエストソース判定
    const source = detectSource(e);
    
    if (source === 'line-openclaw') {
      return handleLineOpenClawRequest(e);
    } else if (source === 'line') {
      return handleLineRequest(e);
    } else {
      return handleDiscordRequest(e);
    }
  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, `エラー: ${error.message}`);
  }
}

/**
 * リクエストソース判定
 */
function detectSource(e) {
  const params = JSON.parse(e.postData.contents);
  
  // OpenClaw経由の特徴: sourceが 'line-openclaw'
  if (params.source === 'line-openclaw') {
    return 'line-openclaw';
  }
  
  // LINE直接の特徴: events配列がある
  if (params.events && Array.isArray(params.events)) {
    return 'line';
  }
  
  // Discordの特徴: attachmentsがある
  if (params.attachments) {
    return 'discord';
  }
  
  return 'unknown';
}

/**
 * OpenClaw経由のLINEリクエスト処理
 * Base64画像データを受信
 */
function handleLineOpenClawRequest(e) {
  const params = JSON.parse(e.postData.contents);
  
  try {
    const base64Image = params.imageData;
    const userId = params.userId;
    const messageId = params.messageId;
    
    if (!base64Image) {
      return createResponse(400, '画像データがありません');
    }
    
    // Base64をBlobに変換
    const imageBlob = Utilities.newBlob(Utilities.base64Decode(base64Image), 'image/jpeg');
    const filename = `line_card_${messageId || Date.now()}.jpg`;
    
    // Driveに保存
    const savedFile = saveImageToDrive(imageBlob, filename);
    
    // OCR実行
    const ocrText = performOCR(savedFile.getBlob());
    
    // データ抽出
    const cardData = parseBusinessCard(ocrText);
    cardData.imageUrl = savedFile.getUrl();
    cardData.rawText = ocrText;
    cardData.source = 'LINE-via-OpenClaw';
    
    // スプレッドシートに追記
    const rowIndex = appendToSpreadsheet(cardData);
    
    // Discord通知（設定されていれば）
    notifyDiscord(cardData, rowIndex, true, 'LINE→OpenClaw経由');
    
    return createResponse(200, '名刺を処理しました', {
      row: rowIndex,
      data: cardData
    });
    
  } catch (error) {
    console.error('OpenClaw経由処理エラー:', error);
    notifyDiscord({ error: error.message }, null, false, 'LINE→OpenClawエラー');
    return createResponse(500, `エラー: ${error.message}`);
  }
}

/**
 * LINEリクエスト処理
 */
function handleLineRequest(e) {
  const params = JSON.parse(e.postData.contents);
  
  // 署名検証（本番環境では必須）
  if (CONFIG.LINE_CHANNEL_SECRET !== 'YOUR_LINE_CHANNEL_SECRET') {
    if (!verifyLineSignature(e)) {
      return createResponse(401, 'Invalid signature');
    }
  }
  
  // 各イベント処理
  for (const event of params.events) {
    if (event.type === 'message' && event.message.type === 'image') {
      processLineImage(event);
    }
  }
  
  // LINEは200 OKを期待
  return ContentService.createTextOutput(JSON.stringify({}))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * LINE署名検証
 */
function verifyLineSignature(e) {
  const signature = e.headers['X-Line-Signature'] || e.headers['x-line-signature'];
  if (!signature) return false;
  
  const secret = CONFIG.LINE_CHANNEL_SECRET;
  const body = e.postData.contents;
  
  const expected = Utilities.computeHmacSha256Signature(body, secret)
    .map(byte => (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, '0'))
    .join('');
  
  return signature === expected;
}

/**
 * LINE画像処理
 */
function processLineImage(event) {
  const messageId = event.message.id;
  const replyToken = event.replyToken;
  const userId = event.source.userId;
  
  try {
    // 1. 画像を取得
    const imageBlob = downloadLineImage(messageId);
    const filename = `line_card_${messageId}.jpg`;
    
    // 2. Driveに保存
    const savedFile = saveImageToDrive(imageBlob, filename);
    
    // 3. OCR実行
    const ocrText = performOCR(savedFile.getBlob());
    
    // 4. データ抽出
    const cardData = parseBusinessCard(ocrText);
    cardData.imageUrl = savedFile.getUrl();
    cardData.rawText = ocrText;
    cardData.source = 'LINE';
    
    // 5. スプレッドシートに追記
    const rowIndex = appendToSpreadsheet(cardData);
    
    // 6. LINEに返信
    replyToLine(replyToken, cardData, true);
    
    // 7. Discordにも通知（設定されていれば）
    notifyDiscord(cardData, rowIndex, true, 'LINEからの登録');
    
  } catch (error) {
    console.error('LINE処理エラー:', error);
    replyToLine(replyToken, { error: error.message }, false);
    notifyDiscord({ error: error.message }, null, false, 'LINE処理エラー');
  }
}

/**
 * LINE画像をダウンロード
 */
function downloadLineImage(messageId) {
  const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
  
  const options = {
    method: 'get',
    headers: {
      'Authorization': `Bearer ${CONFIG.LINE_CHANNEL_ACCESS_TOKEN}`
    },
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  
  if (response.getResponseCode() !== 200) {
    throw new Error(`LINE画像取得エラー: ${response.getContentText()}`);
  }
  
  return response.getBlob();
}

/**
 * LINEに返信
 */
function replyToLine(replyToken, data, success) {
  if (!CONFIG.LINE_CHANNEL_ACCESS_TOKEN || 
      CONFIG.LINE_CHANNEL_ACCESS_TOKEN === 'YOUR_LINE_CHANNEL_ACCESS_TOKEN') {
    console.log('LINE token not configured');
    return;
  }
  
  let message;
  
  if (success) {
    message = {
      type: 'flex',
      altText: '名刺を登録しました',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '✅ 名刺を登録しました',
              weight: 'bold',
              size: 'lg',
              color: '#00b900'
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              spacing: 'sm',
              contents: [
                createLineText('氏名', data.name),
                createLineText('会社名', data.company),
                createLineText('部署', data.department),
                createLineText('TEL', data.tel || data.mobile),
                createLineText('メール', data.email)
              ]
            }
          ]
        }
      }
    };
  } else {
    message = {
      type: 'text',
      text: `❌ 名刺処理エラー:\n${data.error || '不明なエラー'}`
    };
  }
  
  const url = 'https://api.line.me/v2/bot/message/reply';
  const options = {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${CONFIG.LINE_CHANNEL_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({
      replyToken: replyToken,
      messages: [message]
    }),
    muteHttpExceptions: true
  };
  
  UrlFetchApp.fetch(url, options);
}

/**
 * LINE Flex Message用テキスト作成
 */
function createLineText(label, value) {
  return {
    type: 'box',
    layout: 'horizontal',
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
 * Discordリクエスト処理（前回のコードと同じ）
 */
function handleDiscordRequest(e) {
  const params = JSON.parse(e.postData.contents);
  
  if (!params.attachments || params.attachments.length === 0) {
    return createResponse(400, '画像が添付されていません');
  }
  
  const attachment = params.attachments[0];
  const imageUrl = attachment.url;
  const filename = attachment.filename || `card_${Date.now()}.png`;
  
  const savedFile = saveImageToDriveByUrl(imageUrl, filename);
  const ocrText = performOCR(savedFile.getBlob());
  
  const cardData = parseBusinessCard(ocrText);
  cardData.imageUrl = savedFile.getUrl();
  cardData.rawText = ocrText;
  cardData.source = 'Discord';
  
  const rowIndex = appendToSpreadsheet(cardData);
  notifyDiscord(cardData, rowIndex, true);
  
  return createResponse(200, '名刺を処理しました', {
    row: rowIndex,
    data: cardData
  });
}

/**
 * URLから画像をDriveに保存（Discord用）
 */
function saveImageToDriveByUrl(imageUrl, filename) {
  const response = UrlFetchApp.fetch(imageUrl);
  const blob = response.getBlob();
  blob.setName(filename);
  
  let folder;
  if (CONFIG.FOLDER_ID && CONFIG.FOLDER_ID !== 'YOUR_FOLDER_ID') {
    folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
  } else {
    folder = DriveApp.getRootFolder();
  }
  
  return folder.createFile(blob);
}

/**
 * BlobからDriveに保存（LINE用/共通）
 */
function saveImageToDrive(blob, filename) {
  blob.setName(filename);
  
  let folder;
  if (CONFIG.FOLDER_ID && CONFIG.FOLDER_ID !== 'YOUR_FOLDER_ID') {
    folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
  } else {
    folder = DriveApp.getRootFolder();
  }
  
  return folder.createFile(blob);
}

/**
 * Cloud Vision APIでOCR実行
 */
function performOCR(imageBlob) {
  const base64Image = Utilities.base64Encode(imageBlob.getBytes());
  
  const requestBody = {
    requests: [{
      image: { content: base64Image },
      features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
      imageContext: { languageHints: ['ja', 'en'] }
    }]
  };
  
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${CONFIG.VISION_API_KEY}`;
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const result = JSON.parse(response.getContentText());
  
  if (result.error) {
    throw new Error(`Vision API Error: ${result.error.message}`);
  }
  
  const textAnnotations = result.responses[0].textAnnotations;
  if (!textAnnotations || textAnnotations.length === 0) {
    throw new Error('テキストが検出されませんでした');
  }
  
  return textAnnotations[0].description;
}

/**
 * スプレッドシートにデータ追記（ソース列追加）
 */
function appendToSpreadsheet(data) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getActiveSheet();
  
  if (sheet.getLastRow() === 0) {
    const headers = ['日時', 'ソース', '氏名', '会社名', '部署', '役職', 'TEL', '携帯', 'メール', '住所', '画像URL', '生テキスト'];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  
  const row = [
    new Date(),
    data.source || 'Unknown',
    data.name || '',
    data.company || '',
    data.department || '',
    data.title || '',
    data.tel || '',
    data.mobile || '',
    data.email || '',
    data.address || '',
    data.imageUrl || '',
    data.rawText || ''
  ];
  
  sheet.appendRow(row);
  return sheet.getLastRow();
}

/**
 * Discord通知
 */
function notifyDiscord(data, rowIndex, success, note) {
  if (!CONFIG.DISCORD_WEBHOOK_URL || 
      CONFIG.DISCORD_WEBHOOK_URL === 'YOUR_DISCORD_WEBHOOK_URL') {
    return;
  }
  
  let payload;
  
  if (success) {
    const fields = [
      { name: '氏名', value: data.name || '（未検出）', inline: true },
      { name: '会社名', value: data.company || '（未検出）', inline: true },
      { name: '部署', value: data.department || '（未検出）', inline: true },
      { name: 'TEL', value: data.tel || data.mobile || '（未検出）', inline: true },
      { name: 'メール', value: data.email || '（未検出）', inline: true }
    ];
    
    payload = {
      embeds: [{
        title: `✅ 名刺を登録しました ${note ? `(${note})` : ''}`,
        color: 0x00ff00,
        fields: fields,
        footer: { text: `行番号: ${rowIndex} | ソース: ${data.source || 'Unknown'}` },
        timestamp: new Date().toISOString()
      }]
    };
  } else {
    payload = {
      embeds: [{
        title: `❌ 名刺処理エラー ${note ? `(${note})` : ''}`,
        description: data.error || '不明なエラー',
        color: 0xff0000,
        timestamp: new Date().toISOString()
      }]
    };
  }
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  UrlFetchApp.fetch(CONFIG.DISCORD_WEBHOOK_URL, options);
}

/**
 * JSONレスポンス作成
 */
function createResponse(statusCode, message, data) {
  const output = ContentService.createTextOutput(JSON.stringify({
    status: statusCode,
    message: message,
    data: data || null
  }));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// Parser.gsの内容はそのまま使用
