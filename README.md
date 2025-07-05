# Connpass LINE Reminder

ConnpassのイベントリマインダーをLINEで受信するためのシステムです。

## 🚀 機能

- **自動リマインダー**: Connpassイベントの開始前に自動通知
- **カスタム通知タイミング**: 1日前、3時間前、1時間前などの設定可能
- **リッチメッセージ**: イベント詳細を含むFlexMessageでの通知
- **ユーザー管理**: ConnpassアカウントとLINEアカウントの紐付け
- **イベント同期**: Connpass APIからの定期的なイベント取得

## 🏗️ アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Cloud Scheduler │────│ Cloud Functions │────│    Firestore    │
│   (定期実行)    │    │   (メイン処理)  │    │ (データ保存)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
         ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
         │  Connpass API   │    │   LINE API      │    │ Cloud Logging   │
         │                 │    │  (通知送信)      │    │  (ログ・監視)   │
         └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 プロジェクト構造

```
app/
├── backend/                 # バックエンド実装
│   ├── src/
│   │   ├── services/       # ビジネスロジック
│   │   ├── repositories/   # データアクセス層
│   │   ├── models/         # データモデル
│   │   ├── utils/          # ユーティリティ
│   │   └── middleware/     # Express middleware
│   └── package.json
├── infrastructure/         # インフラ設定
│   ├── terraform/         # Terraform設定
│   ├── scripts/           # デプロイスクリプト
│   ├── gcp/              # GCP設定
│   └── monitoring/       # 監視設定
├── frontend/             # フロントエンド (将来拡張用)
└── README.md
```

## 🚀 デプロイ手順

### 1. 前提条件

- Google Cloud Platform アカウント
- LINE Developer アカウント
- gcloud CLI インストール済み
- Node.js 18以上

### 2. LINE Bot 設定

1. LINE Developersコンソールでチャンネルを作成
2. Channel Access Tokenを取得
3. Webhook URLを後で設定

### 3. 自動デプロイ

```bash
# 実行権限を付与
chmod +x infrastructure/scripts/deploy.sh

# デプロイ実行
./infrastructure/scripts/deploy.sh YOUR_PROJECT_ID asia-northeast1 YOUR_LINE_TOKEN
```

### 4. 手動デプロイ

```bash
# 1. プロジェクト設定
gcloud config set project YOUR_PROJECT_ID

# 2. 必要なAPIを有効化
gcloud services enable cloudfunctions.googleapis.com firestore.googleapis.com secretmanager.googleapis.com cloudscheduler.googleapis.com

# 3. LINE Tokenをシークレットに保存
echo "YOUR_LINE_TOKEN" | gcloud secrets create line-channel-access-token --data-file=-

# 4. 関数をデプロイ
cd backend
npm install
npm run build
gcloud functions deploy connpass-reminder --gen2 --region=asia-northeast1 --source=. --entry-point=connpass-reminder --runtime=nodejs18 --trigger=http --allow-unauthenticated

# 5. Cloud Schedulerを設定
cd ../infrastructure/scripts
./setup-scheduler.sh YOUR_PROJECT_ID asia-northeast1
```

## 🏠 ローカル開発

```bash
# 開発環境セットアップ
./infrastructure/scripts/local-dev.sh

# 依存関係インストール
cd backend
npm install

# 環境変数設定
cp .env.example .env
# .envファイルを編集

# 開発サーバー起動
npm run dev
```

## 🔧 設定

### 環境変数

```env
NODE_ENV=production
GOOGLE_CLOUD_PROJECT=your-project-id
FUNCTION_REGION=asia-northeast1
LINE_CHANNEL_ACCESS_TOKEN=your-line-token
```

### リマインダー設定

デフォルトの通知タイミング:
- 1日前 (09:00)
- 3時間前
- 1時間前
- 30分前

## 📱 使用方法

### LINE Bot コマンド

- `登録`: アカウント登録
- `設定`: 現在の設定確認
- `ヘルプ`: 使い方表示

### API エンドポイント

```bash
# ヘルスチェック
GET /connpass-reminder?action=health

# Connpass API テスト
GET /connpass-reminder?action=test

# 手動リマインダー実行
POST /connpass-reminder
Content-Type: application/json
{
  "type": "scheduled"
}
```

## 📊 監視

### Cloud Logging

```bash
# 関数ログ確認
gcloud functions logs read connpass-reminder --project=YOUR_PROJECT_ID

# エラーログフィルター
gcloud functions logs read connpass-reminder --project=YOUR_PROJECT_ID --filter='severity="ERROR"'
```

### Cloud Monitoring

- 関数実行時間
- エラー率
- 通知成功率
- API レスポンス時間

### アラート設定

- 関数エラー率が5%を超過
- 実行時間が30秒を超過
- LINE API エラー率が10%を超過

## 🔍 トラブルシューティング

### よくある問題

1. **LINE通知が送信されない**
   - Channel Access Tokenが正しく設定されているか確認
   - Secret Managerの権限を確認

2. **Connpass APIエラー**
   - APIレート制限に達していないか確認
   - ネットワーク接続を確認

3. **Cloud Scheduler実行エラー**
   - 関数のタイムアウト設定を確認
   - 権限設定を確認

### ログの確認

```bash
# 詳細ログ
gcloud functions logs read connpass-reminder --project=YOUR_PROJECT_ID --limit=50

# 特定時間のログ
gcloud functions logs read connpass-reminder --project=YOUR_PROJECT_ID --filter='timestamp>="2024-01-01T00:00:00Z"'
```

## 🚧 今後の拡張

- [ ] Web UI での設定管理
- [ ] 複数のリマインダーチャンネル対応
- [ ] イベント検索・フィルタリング
- [ ] 統計・分析機能
- [ ] 多言語対応

## 📄 ライセンス

MIT License

## 🤝 コントリビューション

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 サポート

問題や質問がある場合は、GitHubのIssuesまでお願いします。
