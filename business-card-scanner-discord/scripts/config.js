/**
 * Business Card Scanner - Discord Skill Config
 */

module.exports = {
  // GAS Webhook URL（必須: SETUP.mdに従ってデプロイしたGASのURLを設定）
  GAS_WEBHOOK_URL: process.env.BUSINESS_CARD_GAS_URL || 'YOUR_GAS_WEBHOOK_URL_HERE',
  
  // 監視対象チャンネル（名前またはID）
  TARGET_CHANNELS: [
    '名刺登録',
    '名刺監視システム',
    // 必要に応じて追加
  ],
  
  // ファイル設定
  MAX_FILE_SIZE_MB: 10,           // 最大ファイルサイズ（MB）
  ALLOWED_EXTENSIONS: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'],
  
  // 通知設定
  NOTIFY_ON_SUCCESS: true,
  NOTIFY_ON_ERROR: true,
  
  // タイムアウト設定（ミリ秒）
  REQUEST_TIMEOUT: 30000,
};
