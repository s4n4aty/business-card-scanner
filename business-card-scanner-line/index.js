/**
 * Business Card Scanner - LINE Skill
 * OpenClaw経由でLINE Botを管理（オプション）
 * 
 * 注: GAS直接連携でも動作するが、OpenClaw経由の場合のスキル
 */

const axios = require('axios');

const CONFIG = {
  // GAS Webhook URL（GASに直接送信する場合は不要）
  GAS_WEBHOOK_URL: process.env.BUSINESS_CARD_GAS_URL,
  
  // LINE Channel（OpenClawが直接LINE APIを叩く場合）
  LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  
  // 転送モード: 'direct' = GAS直送, 'relay' = OpenClaw中継
  MODE: 'direct'
};

/**
 * LINE→GAS転送ハンドラ（直接転送版）
 * OpenClawはWebhook URLを提供し、LINE→GASの橋渡しを行う
 */
async function handleLineWebhook(body, headers) {
  if (CONFIG.MODE === 'direct' && CONFIG.GAS_WEBHOOK_URL) {
    // GASにそのまま転送
    try {
      const response = await axios.post(CONFIG.GAS_WEBHOOK_URL, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-Line-Signature': headers['x-line-signature']
        },
        timeout: 30000
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('GAS転送エラー:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  // 中継モード（将来的な拡張用）
  return { success: true, message: 'Relay mode not implemented' };
}

/**
 * LINEメッセージ送信（OpenClawから直接LINEを叩く場合）
 */
async function sendLineMessage(userId, message) {
  const url = 'https://api.line.me/v2/bot/message/push';
  
  try {
    const response = await axios.post(url, {
      to: userId,
      messages: [{
        type: 'text',
        text: message
      }]
    }, {
      headers: {
        'Authorization': `Bearer ${CONFIG.LINE_CHANNEL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    return { success: true };
  } catch (error) {
    console.error('LINE送信エラー:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  handleLineWebhook,
  sendLineMessage,
  
  metadata: {
    name: 'business-card-scanner-line',
    description: 'LINE Bot経由の名刺デジタル化（GAS連携）',
    events: ['line_webhook']
  }
};
