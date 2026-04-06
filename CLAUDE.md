# CLAUDE.md - LocalVLM-workers

## プロジェクト概要

ローカルVLM（Vision Language Model）をCloudflare Workers経由でWebブラウザ上で動作・検証するためのプロジェクト。
WebGPU + transformers.js を使い、ブラウザ上でVLMを直接実行する。

**ターゲットデバイス**: Pixel 8（Tensor G3, RAM 8GB）のChrome（Android）で動作すること。

## 技術スタック

- **フロントエンド**: React + TypeScript + Vite
- **VLM実行**: @huggingface/transformers（transformers.js v3）+ WebGPU
- **ホスティング**: Cloudflare Workers（Cloudflare Pages Functions）
- **Workers役割**: SPA配信 + 外部VLMサーバーへのAPI Proxy（CORS処理・レート制限）
- **ビルド**: Vite + Wrangler
- **デプロイ**: GitHub接続による自動デプロイ（GitHub Actionsは使わない）
- **コード解析**: Serena（MCP経由のセマンティックコーディングツール）を積極的に利用する

## Serena（セマンティックコーディングツール）

本プロジェクトではSerena MCPサーバーを利用してコードベースの解析・編集を行う。

- シンボル概要の取得（`get_symbols_overview`）でファイル構造を把握
- シンボル検索（`find_symbol`）でクラス・関数・型の定義を特定
- 参照検索（`find_referencing_symbols`）で依存関係を追跡
- シンボル単位の編集（`replace_symbol_body`, `insert_before_symbol`等）で安全にコードを変更
- ファイル全体の読み込みは最小限に、シンボル単位で必要な箇所だけ読む

## ターゲットVLMモデル

Pixel 8のメモリ制約（8GB RAM）を考慮し、小型モデルのみ対象。
全モデルはHuggingFace Hub経由でダウンロード（transformers.jsのデフォルト挙動）。

- **Gemma 4 E2B** ⭐ — Google製（実効2.3B）。マルチモーダル（画像・音声・テキスト）。ONNX変換済み（`onnx-community/gemma-4-E2B-it-ONNX`）。4bit量子化で~1.5GB、Pixel最適化済み
- **SmolVLM-256M-Instruct** — 最軽量（256M）。1GB未満で推論可能
- **SmolVLM-500M-Instruct** — 256Mより高精度（500M）
- **SmolVLM2-256M-Video-Instruct** — 動画対応版（256M）
- **SmolVLM2-500M-Video-Instruct** — 動画対応版、高精度（500M）

※ moondream2（1.86B）はメモリ9-10GB必要でPixel 8では除外
※ Android Chrome WebGPUクラッシュ問題あり → WASM(q4)フォールバック実装済み

## ディレクトリ構成

```
LocalVLM-workers/
├── src/
│   ├── worker/           # Cloudflare Worker エントリポイント
│   │   └── index.ts      # リクエストルーティング、API Proxy
│   ├── frontend/         # React SPA
│   │   ├── components/   # UIコンポーネント
│   │   ├── pages/        # ページコンポーネント
│   │   ├── hooks/        # カスタムフック（VLM制御等）
│   │   ├── workers/      # Web Worker（transformers.js実行用）
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── types/            # 共有型定義
├── public/               # 静的アセット
├── wrangler.toml         # Cloudflare Workers設定
├── vite.config.ts        # Viteビルド設定
├── tsconfig.json
├── package.json
├── .gitignore
├── CLAUDE.md
└── .claude/
    └── rules/            # Claude Codeルールファイル
```

## 開発コマンド

```bash
# 依存インストール
npm install

# ローカル開発（Vite dev server）
npm run dev

# Cloudflare Workers ローカル開発
npm run dev:worker

# ビルド
npm run build

# 型チェック
npm run type-check

# リント
npm run lint
npm run lint:fix

# フォーマット
npm run format

# 全チェック
npm run check-all

# Cloudflare Workers プレビュー
npm run preview
```

## デプロイ

GitHub接続によるCloudflare自動デプロイを使用。
`main`ブランチへのpushで自動的にCloudflare Pagesにデプロイされる。

**GitHub Actionsは使用しない。**

カスタムドメイン: `LocalVLM-workers.0g0.xyz`

Cloudflare Dashboardでの設定：
- ビルドコマンド: `npm run build`
- ビルド出力ディレクトリ: `dist`
- Node.jsバージョン: 20
- カスタムドメイン: `LocalVLM-workers.0g0.xyz`（Cloudflare DNS → Pages）

## アーキテクチャ

```
ブラウザ（Pixel 8 Chrome）
├── React SPA
│   ├── UI（画像アップロード、チャット、モデル選択）
│   └── Web Worker
│       └── transformers.js + WebGPU
│           └── VLMモデル（SmolVLM等）のローカル推論
└── Cloudflare Workers
    ├── SPA配信（静的ファイル）
    └── API Proxy（外部VLMサーバーへのプロキシ、オプション）
```

## 重要な制約

- WebGPU対応ブラウザのみサポート（Chrome 113+）
- Pixel 8（8GB RAM）で動作するモデルサイズに制限
- transformers.jsのWeb Workerで推論を実行し、UIスレッドをブロックしない
- モデルの初回ロードはキャッシュ後に高速化（Cache API / OPFS）

## URL取得方法

外部URLのコンテンツを取得する際は、`cloudflare-markdown` MCPツールを使用してMarkdown形式で取得すること。
WebFetchではなくMCPツールを優先すること。
