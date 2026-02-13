# 名刺デジタル化システム

LINE/Discordから名刺画像をOCRしてGoogle Sheetsに自動保存するシステム。

## アーキテクチャ

```
[LINE/Discord] → [OpenClaw] → [GAS] → [Cloud Vision API] → [Google Sheets]
                      ↓
               [結果返信]
```

## コンポーネント

| ディレクトリ | 説明 |
|-------------|------|
| `business-card-scanner/` | GAS用メインコード（OCR/Sheets連携） |
| `business-card-scanner-openclaw/` | LINE→OpenClaw→GAS構成 |
| `business-card-scanner-discord/` | Discord連携スキル |
| `business-card-scanner-line/` | LINE直接連携スキル |

## クイックスタート

1. **GCPプロジェクト作成**
   - [Google Cloud Console](https://console.cloud.google.com/)
   - Cloud Vision API有効化
   - APIキー取得

2. **Googleスプレッドシート作成**
   - [sheets.new](https://sheets.new)
   - URLからスプレッドシートIDをコピー

3. **GASデプロイ**
   - [script.google.com](https://script.google.com)
   - `business-card-scanner/Code.gs` をコピー
   - CONFIGを編集
   - Webアプリとしてデプロイ

4. **LINE設定**
   - LINE DevelopersでWebhook URLを設定
   - OpenClawにGAS URLを設定

詳細は各ディレクトリの `SETUP.md` を参照。

## ライセンス

MIT
