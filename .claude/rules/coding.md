# コーディング規約

## 言語・フォーマット

- TypeScript必須。`any`の使用は禁止
- コミットメッセージ・コメント・ドキュメントは日本語
- Prettierフォーマットに従う（singleQuote, semi, trailingComma: es5）
- ESLintルールに違反するコードはコミットしない

## React

- 関数コンポーネント + hooks のみ使用
- 状態管理は React の useState / useReducer で十分。外部ライブラリは不要な限り入れない
- コンポーネントは1ファイル1コンポーネント

## transformers.js / VLM

- 推論処理は必ずWeb Worker内で実行する（UIスレッドをブロックしない）
- モデルロードの進捗をUIにフィードバックする
- Pixel 8（8GB RAM）で動作確認済みのモデルのみ対象
- WebGPU非対応時はフォールバックメッセージを表示する

## Cloudflare Workers

- Workers側のロジックは最小限に保つ（SPA配信 + API Proxy）
- 環境変数・シークレットはwrangler.tomlの`[vars]`またはCloudflare Dashboardで管理
- `wrangler.toml`にシークレットを直接書かない
