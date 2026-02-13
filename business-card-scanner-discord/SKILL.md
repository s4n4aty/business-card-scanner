# Business Card Scanner - Discord Skill

Discordから名刺画像を受信し、GAS経由でOCR・スプレッドシート登録を行うスキル。

## アーキテクチャ

```
[Discord: 画像投稿] ──► [OpenClaw: このスキル] ──► [GAS Webhook] ──► [OCR/Sheets]
                              │
                              ▼
                        [Discord: 結果通知]
```

## 必要な設定

### 1. GAS Webhook URL

`scripts/config.js` の `GAS_WEBHOOK_URL` に、デプロイしたGASのWebアプリURLを設定:

```javascript
GAS_WEBHOOK_URL: 'https://script.google.com/macros/s/xxxxxxxx/exec'
```

### 2. 監視チャンネル設定

`scripts/config.js` の `TARGET_CHANNELS` に監視するチャンネル名またはIDを設定:

```javascript
TARGET_CHANNELS: ['名刺登録', 'business-cards'] // チャンネル名またはID
```

## 使い方

1. 設定したDiscordチャンネルに名刺画像を添付して投稿
2. 自動的にGASがOCR実行 → スプレッドシートに保存
3. Discordに処理結果が通知される

## ファイル構成

```
skills/business-card-scanner-discord/
├── SKILL.md              # このファイル
├── scripts/
│   ├── config.js         # 設定ファイル
│   └── webhook-sender.js # GAS送信ロジック
└── .env.example          # 環境変数サンプル
```

## GAS側との連携

このスキルは画像データをGASに送信します。GAS側では以下の形式で受信:

```json
{
  "attachments": [
    {
      "url": "https://cdn.discordapp.com/.../image.png",
      "filename": "image.png"
    }
  ],
  "content": "メッセージ本文（あれば）",
  "author": {
    "username": "ユーザー名",
    "id": "123456789"
  }
}
```

## セキュリティ注意

- GAS Webhook URLは機密情報として扱う（Discord DM等での共有禁止）
- 本番運用時はGAS側でアクセストークン検証を推奨
