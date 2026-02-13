/**
 * Business Card Scanner - Webhook Sender
 * Discord画像をGASに送信してOCR処理を実行
 */

const axios = require('axios');
const config = require('./config');

/**
 * 画像データをGASに送信して名刺登録を実行
 * @param {Object} message - Discordメッセージオブジェクト
 * @returns {Promise<Object>} GASからのレスポンス
 */
async function sendToGAS(message) {
  // URL設定確認
  if (!config.GAS_WEBHOOK_URL || config.GAS_WEBHOOK_URL.includes('YOUR_GAS')) {
    throw new Error('GAS_WEBHOOK_URLが設定されていません。config.jsを編集してください。');
  }

  // 添付ファイル確認
  if (!message.attachments || message.attachments.size === 0) {
    throw new Error('添付ファイルがありません');
  }

  const attachment = message.attachments.first();
  
  // ファイルサイズチェック
  const fileSizeMB = attachment.size / (1024 * 1024);
  if (fileSizeMB > config.MAX_FILE_SIZE_MB) {
    throw new Error(`ファイルサイズが大きすぎます（最大${config.MAX_FILE_SIZE_MB}MB）`);
  }

  // 拡張子チェック
  const ext = attachment.name.substring(attachment.name.lastIndexOf('.')).toLowerCase();
  if (!config.ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`対応していないファイル形式です: ${ext}`);
  }

  // GASに送信するペイロード
  const payload = {
    attachments: [{
      url: attachment.url,
      filename: attachment.name,
      size: attachment.size,
      contentType: attachment.contentType
    }],
    content: message.content || '',
    author: {
      username: message.author.username,
      id: message.author.id,
      displayName: message.author.displayName || message.author.username
    },
    channel: {
      name: message.channel.name,
      id: message.channel.id
    },
    timestamp: message.createdAt.toISOString()
  };

  try {
    const response = await axios.post(config.GAS_WEBHOOK_URL, payload, {
      timeout: config.REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return {
      success: true,
      data: response.data,
      message: '名刺を処理しました'
    };
  } catch (error) {
    console.error('GAS送信エラー:', error.message);
    
    if (error.response) {
      throw new Error(`GASエラー: ${error.response.data?.message || error.response.statusText}`);
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('GAS接続がタイムアウトしました');
    } else {
      throw new Error(`通信エラー: ${error.message}`);
    }
  }
}

/**
 * チャンネルが監視対象かチェック
 * @param {Object} channel - Discordチャンネルオブジェクト
 * @returns {boolean}
 */
function isTargetChannel(channel) {
  return config.TARGET_CHANNELS.some(target => 
    channel.name === target || 
    channel.id === target
  );
}

module.exports = {
  sendToGAS,
  isTargetChannel
};
