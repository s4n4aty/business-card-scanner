/**
 * Business Card Scanner - OpenClaw Main Skill
 * LINE → OpenClaw → GAS 統合スキル
 */

const lineHandler = require('./line-handler');

/**
 * スキルメタデータ
 */
const metadata = {
  name: 'business-card-scanner-openclaw',
  description: 'LINEから名刺画像を受信してOCR処理（OpenClaw経由）',
  version: '1.0.0',
  
  // エンドポイント定義
  endpoints: [
    {
      path: '/webhook/line',
      method: 'POST',
      handler: 'handleLineWebhook',
      description: 'LINE Bot webhook endpoint'
    }
  ],
  
  // 必要な環境変数
  env: [
    'LINE_CHANNEL_ACCESS_TOKEN',
    'LINE_CHANNEL_SECRET',
    'BUSINESS_CARD_GAS_URL'
  ]
};

/**
 * LINE Webhookエンドポイントハンドラ
 */
async function handleLineWebhook(req, res) {
  return lineHandler.handleLineWebhook(req, res);
}

/**
 * スキル初期化
 */
async function init(context) {
  const config = lineHandler.getConfig();
  
  console.log('Business Card Scanner initialized');
  console.log('- GAS configured:', config.gasConfigured);
  console.log('- LINE token configured:', config.lineTokenConfigured);
  console.log('- LINE secret configured:', config.lineSecretConfigured);
  
  return {
    status: 'ready',
    endpoints: metadata.endpoints
  };
}

/**
 * ヘルスチェック
 */
async function health() {
  const config = lineHandler.getConfig();
  
  return {
    status: config.gasConfigured && config.lineTokenConfigured ? 'healthy' : 'degraded',
    checks: config
  };
}

module.exports = {
  metadata,
  init,
  health,
  handleLineWebhook
};
