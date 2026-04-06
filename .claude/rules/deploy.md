# デプロイ方針

## Cloudflare自動デプロイ

- GitHub接続による自動デプロイを使用する
- `main`ブランチへのpush/mergeでCloudflare Pagesが自動ビルド・デプロイ
- **GitHub Actionsは一切使用しない**
- `.github/workflows/`ディレクトリは作成しない

## ブランチ運用

- `main`: 本番ブランチ。自動デプロイ対象
- `master`または機能ブランチ: 開発用。PRを経てmainにマージ

## ビルド設定（Cloudflare Dashboard）

- フレームワークプリセット: None
- ビルドコマンド: `npm run build`
- ビルド出力ディレクトリ: `dist`
- ルートディレクトリ: `/`
- Node.jsバージョン: 20（環境変数 `NODE_VERSION=20`）

## コミット前チェック

コード変更後は必ず以下を実行してからコミットする：

```bash
npm run check-all
```
