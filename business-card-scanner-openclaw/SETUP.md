# LINE → OpenClaw → GAS 連携セットアップ

LINEから名刺画像を送る → OpenClawが受信 → GASでOCR → Sheets保存 → LINEに結果返信

---

## アーキテクチャ

```
┌─────────┐    Webhook    ┌──────────┐    Base64    ┌─────┐
│  LINE   │ ─────────────► │ OpenClaw │ ───────────► │ GAS │
│ (画像)  │                │ (中継)   │              │     │
└─────────┘                └──────────┘              └──┬──┘
     ▲                      │                          │
     │                      │ 結果                     │ OCR
     │                      │                          ▼
     │                   返信                      ┌────────┐
     │                                             │ Sheets │
     └─────────────────────────────────────────────┘ Drive
```

---

## 必要な情報

### 1. LINE Developers（既存の公式アカウント）

| 項目 | 取得場所 |
|-----|---------|
| **チャンネルアクセストークン** | Messaging API設定 → チャンネルアクセストークン |
| **チャンネルシークレット** | 基本設定 → チャンネルシークレット |

### 2. OpenClaw側準備

```bash
# .envに設定
LINE_CHANNEL_ACCESS_TOKEN=xxx
LINE_CHANNEL_SECRET=xxx
BUSINESS_CARD_GAS_URL=https://script.google.com/macros/s/xxx/exec
```

### 3. GAS側準備

- `SPREADSHEET_ID` - スプレッドシートURLから取得
- `VISION_API_KEY` - GCPで発行
- その他は共通設定

---

## セットアップ手順

### Step 1: OpenClawエンドポイント確認

OpenClawがLINE Webhookを受け付けるエンドポイントURLを確認:

```
https://your-openclaw-instance.com/webhook/line
# または
https://your-gateway.openclaw.ai/line-webhook
```

※ OpenClawの設定により異なります。確認が必要。

### Step 2: LINE Webhook URL設定

1. LINE Developers → チャンネル → **Messaging API設定**
2. **Webhook URL** にOpenClawのエンドポイントを設定
3. **検証** をクリック
4. **Webhookの利用**: **ON**
5. **応答メッセージ**: **OFF**（OpenClawが制御するため）

### Step 3: 環境変数設定

OpenClawの `.env` または環境変数:

```env
# LINE Bot
LINE_CHANNEL_ACCESS_TOKEN=YOUR_LINE_CHANNEL_ACCESS_TOKEN
LINE_CHANNEL_SECRET=YOUR_LINE_CHANNEL_SECRET

# GAS連携
BUSINESS_CARD_GAS_URL=https://script.google.com/macros/s/XXXXXXXX/exec

# Discord通知（任意）
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx
```

### Step 4: GASデプロイ

1. `skills/business-card-scanner/Code.gs` をコピー
2. `CONFIG` を編集:
   ```javascript
   SPREADSHEET_ID: 'your-spreadsheet-id',
   VISION_API_KEY: 'your-vision-api-key',
   // LINE設定は不要（OpenClawが処理するため）
   ```
3. Webアプリとしてデプロイ（「全員」にアクセス許可）
4. URLを `BUSINESS_CARD_GAS_URL` に設定

### Step 5: 動作確認

1. LINEでBotを友達追加（またはトーク画面を開く）
2. 名刺画像を送信
3. 以下が自動実行される:
   - OpenClawがWebhook受信
   - 画像を取得・Base64変換
   - GASに送信
   - OCR実行 → Sheets保存
   - LINEに結果返信

---

## ファイル構成

```
skills/business-card-scanner-openclaw/
├── line-handler.js       # メインハンドラ
├── SKILL.md              # このドキュメント
└── .env.example          # 環境変数サンプル

skills/business-card-scanner/
├── Code.gs               # GASコード（line-openclaw対応済み）
├── Parser.gs             # OCRパーサー
└── SETUP.md              # GAS詳細設定
```

---

## トラブルシューティング

### Webhook検証が失敗する

```
原因: OpenClawの署名検証が正しくない
対処: line-handler.js の verifySignature を確認
```

### OpenClawにリクエストが届かない

```
原因: ファイアウォール/ルーティング設定
対処: OpenClawのエンドポイントURLを確認、ログを確認
```

### GASエラー

```
原因: Vision API無効、クォータ超過
対処: GCPコンソールで確認
```

### LINEに返信が来ない

```
原因: LINE_CHANNEL_ACCESS_TOKENが間違い
対処: 再発行して設定
```

---

## セキュリティ

- **LINE_CHANNEL_SECRET** は絶対に外部に漏らさない
- OpenClawのWebhookエンドポイントはHTTPS必須
- GASは「全員」アクセスだが、URLは推測困難なものに

---

## 次のステップ

- **複数画像対応**: 1メッセージに複数画像が添付された場合の処理
- **リッチメニュー**: LINEで操作メニューを追加
- **認証追加**: GAS側で簡易的なトークン検証を追加

---

## 設定サマリー

| コンポーネント | 設定項目 | 値 |
|-------------|---------|---|
| LINE | Webhook URL | OpenClawのエンドポイント |
| OpenClaw | LINE_CHANNEL_ACCESS_TOKEN | 発行したトークン |
| OpenClaw | LINE_CHANNEL_SECRET | チャンネルシークレット |
| OpenClaw | BUSINESS_CARD_GAS_URL | GASのWebアプリURL |
| GAS | SPREADSHEET_ID | スプレッドシートID |
| GAS | VISION_API_KEY | Cloud Vision APIキー |
