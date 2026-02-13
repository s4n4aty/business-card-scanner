# 名刺デジタル化システム - クイックスタート

## 概要

Discordに名刺画像を送る → 自動でOCR → Google Sheetsに保存

## セットアップ手順（15分）

### 1. GAS側準備（10分）

```bash
# 1. GCPプロジェクト作成
# https://console.cloud.google.com/ → 新規プロジェクト

# 2. Cloud Vision API有効化
# APIライブラリ → "Cloud Vision API" → 有効化

# 3. APIキー取得
# 認証情報 → APIキーを作成 → コピー
```

### 2. GASコードデプロイ（3分）

1. https://script.google.com → 新規プロジェクト
2. `Code.gs` と `Parser.gs` をコピペ
3. `CONFIG` を編集（APIキー、スプレッドシートID等）
4. **デプロイ** → **Webアプリ** → **全員**にアクセス許可
5. WebアプリURLをコピー

### 3. Discord連携（2分）

**方法A: 直接Webhook（シンプル）**
- Discordサーバー設定 → 連携サービス → Webhook → GASの`DISCORD_WEBHOOK_URL`に設定

**方法B: OpenClawスキル（推奨）**
- `skills/business-card-scanner-discord/config.js` の `GAS_WEBHOOK_URL` を設定
- スキルを有効化

## ファイル構成

```
skills/
├── business-card-scanner/           # GAS側コード
│   ├── Code.gs                      # メイン処理
│   ├── Parser.gs                    # OCRパーサー
│   └── SETUP.md                     # 詳細セットアップ手順
│
└── business-card-scanner-discord/   # Discord側スキル
    ├── index.js                     # メインハンドラ
    ├── scripts/
    │   ├── config.js                # 設定
    │   └── webhook-sender.js        # GAS送信ロジック
    └── SKILL.md                     # スキル説明
```

## 使い方

1. Discordの設定したチャンネルに名刺画像を添付投稿
2. 自動処理 → Sheetsに保存
3. Discordに結果通知

## トラブルシューティング

| 問題 | 解決策 |
|-----|-------|
| GASエラー | Vision API有効化・請求先アカウント設定確認 |
| OCR失敗 | 画像品質を確認・Parser.gsの正規表現調整 |
| Discord通知来ない | Webhook URL設定確認 |

## 次のステップ

- LINE連携: `doPost()` を修正してLINE署名検証を追加
- カスタムパーサー: Parser.gsに業界別パターンを追加
- 自動分類: Sheetsの列を拡張してタグ付け

詳細は `SETUP.md` を参照。
