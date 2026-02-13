# LINE連携セットアップ手順

LINE Botを使って名刺画像を受信し、OCR → Sheets保存する手順。

---

## 概要

```
[LINE: 名刺画像送信] ──► [GAS Webhook] ──► [OCR/Sheets]
           │                                    │
           └────────── 結果返信 ◄───────────────┘
```

---

## 1. LINE DevelopersでBot作成

### 1.1 プロバイダー/チャンネル作成

1. [LINE Developers](https://developers.line.biz/) にアクセス
2. **ログイン** → プロバイダーを作成（または既存を使用）
3. **新規チャンネル作成** → **Messaging API** を選択
4. 入力項目:
   - チャンネル名: `名刺デジタル化Bot`
   - チャンネル説明: `名刺を撮影すると自動でデータ化します`
   - 大業種: `個人`
   - 小業種: `その他`
   - プラン: **Developer Trial**（無料）または **Free**（応答のみ）

### 1.2 必要な情報を取得

作成後、**チャンネル基本設定**タブで:

| 項目 | 用途 |
|-----|------|
| **チャンネルアクセストークン** | GASの `LINE_CHANNEL_ACCESS_TOKEN` |
| **チャンネルシークレット** | GASの `LINE_CHANNEL_SECRET` |
| **Webhook URL** | 後でGASのURLを設定 |

**取得手順:**
1. **チャンネルアクセストークン** → **発行** → トークンをコピー
2. **チャンネルシークレット** → コピー（Basic settingsタブ）

---

## 2. GASコード設定

### 2.1 LINE設定

`Code.gs` の `CONFIG` を編集:

```javascript
const CONFIG = {
  // ...既存設定...
  
  // LINE用
  LINE_CHANNEL_ACCESS_TOKEN: 'YOUR_ACTUAL_LINE_TOKEN_HERE',  // 発行したトークン
  LINE_CHANNEL_SECRET: 'YOUR_ACTUAL_LINE_SECRET_HERE'        // シークレット
};
```

### 2.2 Webアプリとして再デプロイ

1. **デプロイ** → **デプロイを変更**
2. **種類**: Webアプリ
3. **アクセスできるユーザー**: **全員**（LINEからのアクセスに必要）
4. **デプロイ** → URLをコピー

---

## 3. LINE Webhook設定

### 3.1 Webhook URL登録

1. LINE Developers → チャンネル → **Messaging API設定**タブ
2. **Webhook URL** にGASのURLを貼り付け
3. **検証** をクリック → **成功** と表示されたらOK
4. **Webhookの利用**: **ON** にする

### 3.2 自動応答設定（推奨）

**応答設定** → **応答メッセージ**: **OFF**（GAS側で制御するため）

### 3.3 友達追加方法

**Messaging API設定**タブの **QRコード** をスキャンしてBotを友達追加

---

## 4. 動作確認

1. LINEでBotを友達追加
2. 名刺画像を送信（テキスト添付不要）
3. 数秒後、以下が自動実行:
   - 画像をDriveに保存
   - OCRでテキスト抽出
   - Sheetsにデータ追加
   - LINEに結果が返信（Flex Message形式）

---

## トラブルシューティング

### Webhook検証が失敗する

| 原因 | 対処 |
|-----|------|
| URLが間違っている | GASのWebアプリURLを確認 |
| アクセス権限 | GASを「全員」に設定し直す |
| スクリプトエラー | GASの実行ログを確認 |

### LINEに返信が来ない

| 原因 | 対処 |
|-----|------|
| チャンネルアクセストークンが間違い | 再発行して設定 |
| 応答メッセージがON | LINE設定でOFFにする |
| トークン期限切れ | Developer Trialは期限あり、Freeプラン推奨 |

### OCR結果が変

- `Parser.gs` の正規表現を名刺のレイアウトに合わせて調整
- Sheetsの「生テキスト」列でOCR結果を確認

---

## Discordとの併用

同じGASで両方対応できます:

| ソース | 動作 |
|-------|------|
| LINE | 画像受信 → OCR → Sheets → LINE返信 → Discord通知 |
| Discord | 画像受信 → OCR → Sheets → Discord通知 |

Discord通知はオプション。設定しない場合はLINEのみの動作になります。

---

## セキュリティ注意

- **チャンネルアクセストークン** は厳重に管理（再発行可能）
- **チャンネルシークレット** は第三者に漏らさない
- GASのWebアプリURLは推測困難なものだが、機密情報として扱う

---

## 次のステップ

- **リッチメニュー**: LINEでメニュー画面を追加
- **複数画像対応**: 1メッセージに複数名刺が添付された場合の処理
- **ユーザー識別**: LINEのuserIdで送信者を記録

詳細は [LINE Messaging APIドキュメント](https://developers.line.biz/ja/docs/messaging-api/) を参照。
