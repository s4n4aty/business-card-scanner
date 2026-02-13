# Business Card Scanner - OpenClaw

LINE → OpenClaw → GAS → OCR/Sheets → LINE返信

## クイックスタート

```bash
# 1. 環境変数設定
export LINE_CHANNEL_ACCESS_TOKEN="your-token"
export LINE_CHANNEL_SECRET="your-secret"
export BUSINESS_CARD_GAS_URL="https://script.google.com/..."

# 2. LINE DevelopersでWebhook URL設定
# https://developers.line.biz/ → Webhook URL: https://your-openclaw/webhook/line

# 3. 動作確認
# LINEで名刺画像を送信 → 自動処理 → 結果返信
```

## ファイル

- `index.js` - メインスキル
- `line-handler.js` - LINE webhook処理
- `SETUP.md` - 詳細セットアップ手順

## 依存

- `axios` - HTTPクライアント
- `crypto` - LINE署名検証

## OpenClaw統合

このスキルはOpenClawにエンドポイントを登録します:

```javascript
// OpenClaw設定例
skills: [
  {
    name: 'business-card-scanner-openclaw',
    enabled: true,
    endpoints: {
      '/webhook/line': 'POST'
    }
  }
]
```
