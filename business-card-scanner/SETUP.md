# 名刺デジタル化システム - セットアップ手順書

このシステムは Discord から名刺画像を受信し、Google Cloud Vision API で OCR して Google スプレッドシートに自動保存します。

---

## 事前準備

必要なアカウント:
- Google アカウント
- Discord アカウント

---

## 1. GCP プロジェクト作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成
   - プロジェクト名: `business-card-scanner` （任意）
3. プロジェクトIDをメモ（後で使用）

---

## 2. Cloud Vision API 有効化

1. [API ライブラリ](https://console.cloud.google.com/apis/library) を開く
2. `Cloud Vision API` を検索して選択
3. **有効化** をクリック
4. [認証情報](https://console.cloud.google.com/apis/credentials) を開く
5. **認証情報を作成** → **APIキー**
6. 生成されたAPIキーをコピーして保管（`Code.gs`の`VISION_API_KEY`に設定）

---

## 3. Google Apps Script プロジェクト作成

### 3.1 スクリプト作成

1. [script.google.com](https://script.google.com) にアクセス
2. **新しいプロジェクト** をクリック
3. プロジェクト名を変更: `名刺デジタル化システム`

### 3.2 コード追加

1. `コード.gs` の名前を `Code.gs` に変更
2. `Code.gs` の内容を本プロジェクトの `Code.gs` に置き換え
3. **ファイル** → **新規作成** → **スクリプト** → `Parser.gs`
4. `Parser.gs` の内容を本プロジェクトの `Parser.gs` に置き換え

### 3.3 マニフェスト設定

1. **プロジェクトの設定**（歯車アイコン）を開く
2. **appscript.json マニフェストを表示** にチェック
3. `appsscript.json` を以下のように編集:

```json
{
  "timeZone": "Asia/Tokyo",
  "dependencies": {
    "enabledAdvancedServices": []
  },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "access": "ANYONE_ANONYMOUS",
    "executeAs": "ME"
  }
}
```

---

## 4. スプレッドシート作成

1. [Google Sheets](https://sheets.new) で新規作成
2. スプレッドシート名: `名刺データ`（任意）
3. シート名を `名刺データ` に変更（`Code.gs`の設定と一致させる）
4. **URLからスプレッドシートIDをコピー**:
   - URL: `https://docs.google.com/spreadsheets/d/`**`SPREADSHEET_ID`**`/edit`
   - `SPREADSHEET_ID` の部分をメモ

---

## 5. Google Drive フォルダ作成（オプション）

1. Drive で新しいフォルダを作成（例: `名刺画像`）
2. フォルダを開いて **URLからフォルダIDをコピー**:
   - URL: `https://drive.google.com/drive/folders/`**`FOLDER_ID`**
   - `FOLDER_ID` の部分をメモ
   - 未設定の場合はルートフォルダに保存されます

---

## 6. GAS コードの設定

`Code.gs` の先頭にある `CONFIG` を編集:

```javascript
const CONFIG = {
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID',      // ← 4. でコピーしたID
  SHEET_NAME: '名刺データ',                    // ← シート名
  FOLDER_ID: 'YOUR_FOLDER_ID',                 // ← 5. でコピーしたID（任意）
  DISCORD_WEBHOOK_URL: 'YOUR_WEBHOOK_URL',     // ← 後で設定
  VISION_API_KEY: 'YOUR_VISION_API_KEY'        // ← 2. で取得したAPIキー
};
```

---

## 7. Web アプリとしてデプロイ

1. GAS エディタで **デプロイ** → **新しいデプロイ** をクリック
2. 種類: **Webアプリ**
3. 設定:
   - **説明**: `名刺デジタル化 v1`
   - **実行ユーザー**: `自分`
   - **アクセスできるユーザー**: `全員`
4. **デプロイ** をクリック
5. **許可** ボタンをクリック（初回のみ）
   - Googleアカウントでログイン
   - **詳細** → `名刺デジタル化システム（安全ではないページ）` を開く
   - **許可** をクリック
6. **WebアプリのURL** をコピー（`https://script.google.com/macros/s/.../exec`）

---

## 8. Discord Webhook 設定

### 8.1 Discord サーバー準備

1. 名刺を送信したい Discord サーバーにアクセス
2. （推奨）専用のテキストチャンネルを作成（例: `#名刺登録`）

### 8.2 Webhook 作成

1. チャンネル設定 → **連携サービス** → **ウェブフック** → **新しいウェブフック**
2. 名前: `名刺デジタル化システム`
3. **ウェブフックURLをコピー**

### 8.3 GAS に設定

1. `Code.gs` の `DISCORD_WEBHOOK_URL` にコピーしたURLを貼り付け
2. **保存**（Ctrl+S）
3. 再度 **デプロイ** → **デプロイを変更** → **新しいバージョン** で更新

---

## 9. 動作確認

### 9.1 簡易テスト

1. Discord の設定したチャンネルに名刺画像を添付して送信
2. 数秒後、以下が自動実行される:
   - 画像が Google Drive に保存
   - OCR でテキスト抽出
   - スプレッドシートにデータ追加
   - Discord に結果通知

### 9.2 手動テスト（GASエディタ内）

```javascript
function testOCR() {
  const testText = `株式会社テスト
営業部 部長
田中 太郎

TEL: 03-1234-5678
Email: tanaka@test.co.jp
東京都渋谷区`;
  
  const result = parseBusinessCard(testText);
  console.log(result);
}
```

---

## 10. 他プラットフォームへの展開

このシステムは Webhook 仕様を変更することで、以下にも対応可能です:

| プラットフォーム | 変更箇所 |
|---------------|---------|
| Slack | `doPost()` の `params` パース部分 |
| LINE | `doPost()` の署名検証追加 |
| メール | Gmail トリガーに変更 |
| API直叩き | `doPost()` をそのまま使用 |

---

## トラブルシューティング

### エラー: "画像が添付されていません"
- Discord の画像添付確認
- Webhook URL が正しいか確認

### エラー: Vision API
- APIキーが有効か確認
- 請求先アカウントが設定されているか確認

### データが抽出されない
- `Parser.gs` の正規表現を名刺のフォーマットに合わせて調整
- スプレッドシートの「生テキスト」列でOCR結果を確認

---

## 参考リンク

- [Google Cloud Vision API ドキュメント](https://cloud.google.com/vision/docs)
- [Google Apps Script リファレンス](https://developers.google.com/apps-script)
- [Discord Webhook ガイド](https://discord.com/developers/docs/resources/webhook)
