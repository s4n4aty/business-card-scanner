/**
 * Business Card Scanner - Discord Handler
 * OpenClaw統合用メインハンドラ
 */

const { sendToGAS, isTargetChannel } = require('./scripts/webhook-sender');
const config = require('./scripts/config');

/**
 * Discordメッセージハンドラ
 * @param {Object} message - Discordメッセージオブジェクト
 * @param {Object} context - OpenClawコンテキスト
 */
async function handleMessage(message, context) {
  // 監視対象チャンネルかチェック
  if (!isTargetChannel(message.channel)) {
    return null; // 無視
  }

  // 添付ファイルがあるかチェック
  if (!message.attachments || message.attachments.size === 0) {
    return null; // 画像がない場合は無視
  }

  // Bot自身のメッセージは無視（無限ループ防止）
  if (message.author.bot) {
    return null;
  }

  try {
    // 処理中メッセージを送信
    if (config.NOTIFY_ON_SUCCESS) {
      await message.react('⏳');
    }

    // GASに送信してOCR処理
    const result = await sendToGAS(message);

    // 成功リアクション
    await message.reactions.removeAll();
    await message.react('✅');

    return {
      success: true,
      result: result.data
    };

  } catch (error) {
    console.error('名刺処理エラー:', error);
    
    // エラーリアクション
    await message.reactions.removeAll();
    await message.react('❌');

    // エラーメッセージ送信
    if (config.NOTIFY_ON_ERROR) {
      await message.reply(`名刺処理に失敗しました: ${error.message}`);
    }

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * スラッシュコマンドハンドラ（オプション）
 * /名刺登録 コマンドで手動実行
 */
async function handleSlashCommand(interaction, context) {
  const subcommand = interaction.options.getSubcommand();
  
  if (subcommand === 'status') {
    return {
      content: `名刺スキャナー状態:\n- GAS URL: ${config.GAS_WEBHOOK_URL !== 'YOUR_GAS_WEBHOOK_URL_HERE' ? '✅ 設定済み' : '❌ 未設定'}\n- 監視チャンネル: ${config.TARGET_CHANNELS.join(', ')}`
    };
  }
  
  if (subcommand === 'test') {
    return {
      content: 'テスト機能は未実装です。画像を添付して投稿してください。'
    };
  }
}

module.exports = {
  handleMessage,
  handleSlashCommand,
  
  // OpenClawスキル登録用メタデータ
  metadata: {
    name: 'business-card-scanner-discord',
    description: 'Discordから名刺画像を受信してGAS経由でOCR処理',
    events: ['messageCreate'],
    commands: [
      {
        name: '名刺登録',
        description: '名刺スキャナー設定',
        options: [
          {
            name: 'status',
            description: '現在の設定状態を表示',
            type: 1 // SUB_COMMAND
          },
          {
            name: 'test',
            description: '接続テスト',
            type: 1 // SUB_COMMAND
          }
        ]
      }
    ]
  }
};
