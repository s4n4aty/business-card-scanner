# Business Card Scanner - LINE Skill

LINE Botを使った名刺デジタル化スキル。

## アーキテクチャ（2パターン）

### パターンA: GAS直接連携（推奨・シンプル）
```
LINE ──► GAS(Webhook) ──► OCR/Sheets ──► LINE返信
```
- OpenClawは不要（GASだけで完結）
- セットアップ: `LINE_SETUP.md` 参照

### パターンB: OpenClaw中継（拡張性重視）
```
LINE ──► OpenClaw ──► GAS ──► OCR/Sheets ──► OpenClaw ──► LINE返信
```
- 前処理・後処理のカスタマイズが可能
- このスキルを使用

## 使い方（パターンBの場合）

1. `.env` に `BUSINESS_CARD_GAS_URL` を設定
2. `MODE: 'relay'` に変更（必要に応じて実装）
3. LINE DevelopersでWebhook URLをOpenClawのエンドポイントに設定

## 推奨

パターンA（GAS直接）で十分な場合が多い。拡張が必要になったらパターンBへ移行。
