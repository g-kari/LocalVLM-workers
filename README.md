# LocalVLM-workers

これ見てwebでも動くんかなと試し
https://x.com/i/status/2041109577790631975

ブラウザ上でVLM（Vision Language Model）を動作・検証するためのWebアプリケーション。
Cloudflare Workers経由でSPA配信し、WebGPU + transformers.jsでクライアントサイド推論を実行する。

**ターゲットデバイス**: Pixel 8（Tensor G3, RAM 8GB）

**URL**: https://local-vlm-workers.0g0.xyz

## アーキテクチャ

```mermaid
graph TB
    subgraph Browser["ブラウザ (Pixel 8 Chrome)"]
        UI["React SPA<br/>モデル選択 / 画像入力 / チャット"]
        WW["Web Worker"]
        TJS["transformers.js v3"]
        GPU["WebGPU / WASM"]
        
        UI -->|画像 + プロンプト| WW
        WW --> TJS
        TJS --> GPU
        GPU -->|推論結果| WW
        WW -->|テキスト応答| UI
    end

    subgraph CF["Cloudflare"]
        Pages["Cloudflare Pages<br/>SPA静的ファイル配信"]
        Func["Pages Functions<br/>API Proxy"]
    end

    subgraph HF["HuggingFace Hub"]
        Models["VLMモデル<br/>(ONNX / WebGPU)"]
    end

    Browser -->|HTTPS| CF
    Pages -->|HTML/JS/WASM| Browser
    TJS -->|モデルDL & キャッシュ| Models
    UI -.->|オプション| Func
    Func -.->|外部VLMサーバー| ExtAPI["外部API"]
```

## モデル読み込みフロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as React SPA
    participant Worker as Web Worker
    participant TJS as transformers.js
    participant HF as HuggingFace Hub

    User->>UI: モデル選択 & 読み込みボタン
    UI->>Worker: postMessage({ type: 'load', modelId })
    Worker->>TJS: AutoProcessor.from_pretrained()
    TJS->>HF: モデルファイルDL (ONNX)
    HF-->>TJS: モデルデータ (Cache API保存)
    
    alt WebGPU利用可能
        Worker->>TJS: from_pretrained({ device: 'webgpu', dtype: 'fp16' })
        TJS-->>Worker: モデルロード完了
        Worker-->>UI: { type: 'ready', device: 'webgpu' }
    else WebGPU失敗 or 非対応
        Worker->>TJS: from_pretrained({ device: 'wasm', dtype: 'q4' })
        TJS-->>Worker: モデルロード完了 (フォールバック)
        Worker-->>UI: { type: 'ready', device: 'wasm' }
    end

    UI-->>User: デバイス状態表示 (⚡WebGPU / 🔄WASM)
```

## 推論フロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as React SPA
    participant Worker as Web Worker
    participant TJS as transformers.js

    User->>UI: 画像選択 + プロンプト入力
    UI->>UI: 画像リサイズ (最大512px)
    UI->>Worker: postMessage({ type: 'infer', imageData, prompt })
    Worker->>TJS: processor.apply_chat_template()
    Worker->>TJS: processor(text, images)
    Worker->>TJS: model.generate({ max_new_tokens })
    TJS-->>Worker: 生成トークン
    Worker->>TJS: processor.batch_decode()
    TJS-->>Worker: テキスト結果
    Worker-->>UI: { type: 'result', text }
    UI-->>User: 結果表示
```

## 対応モデル

| モデル | パラメータ数 | 特徴 |
|--------|------------|------|
| **Gemma 4 E2B** ⭐ | 2.3B (実効) | Google製。マルチモーダル。ONNX変換済み。Pixel最適化 |
| SmolVLM-256M | 256M | 最軽量。1GB未満で推論可能 |
| SmolVLM-500M | 500M | 256Mより高精度 |
| SmolVLM2-256M Video | 256M | 動画対応版 |
| SmolVLM2-500M Video | 500M | 動画対応版、高精度 |

全モデルはHuggingFace Hub経由でブラウザにダウンロード・キャッシュされる。

## 技術スタック

- **フロントエンド**: React 19 + TypeScript + Vite
- **VLM実行**: @huggingface/transformers (transformers.js) + WebGPU
- **ホスティング**: Cloudflare Workers / Pages
- **API Proxy**: Cloudflare Pages Functions
- **コード品質**: ESLint + Prettier + TypeScript strict mode

## セットアップ

```bash
# 依存インストール
npm install

# ローカル開発サーバー起動
npm run dev

# ビルド
npm run build

# Cloudflare Workersローカルプレビュー
npm run preview
```

## 開発コマンド

```bash
npm run dev          # Vite開発サーバー
npm run dev:worker   # Wrangler Pagesローカル開発
npm run build        # 本番ビルド
npm run type-check   # TypeScript型チェック
npm run lint         # ESLintチェック
npm run lint:fix     # ESLint自動修正
npm run format       # Prettierフォーマット
npm run check-all    # 全チェック (type-check + lint + build)
npm run preview      # Wrangler Pagesプレビュー
```

## デプロイ

GitHub接続によるCloudflare自動デプロイ。`main`ブランチへのpush/mergeで自動ビルド・デプロイ。

**GitHub Actionsは使用しない。**

```mermaid
graph LR
    Dev["開発者"] -->|git push| GH["GitHub<br/>main branch"]
    GH -->|Webhook| CF["Cloudflare Pages"]
    CF -->|npm run build| Build["ビルド"]
    Build -->|dist/| Deploy["デプロイ"]
    Deploy --> Domain["LocalVLM-workers.0g0.xyz"]
```

## ディレクトリ構成

```
LocalVLM-workers/
├── src/
│   ├── frontend/           # React SPA
│   │   ├── components/     # UIコンポーネント
│   │   ├── hooks/          # カスタムフック (VLM制御)
│   │   ├── workers/        # Web Worker (transformers.js実行)
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── types/              # 共有型定義
├── functions/              # Cloudflare Pages Functions
│   └── api/
│       └── proxy.ts        # API Proxy (CORS処理)
├── public/                 # 静的アセット
├── wrangler.toml           # Cloudflare Workers設定
├── vite.config.ts          # Viteビルド設定
├── CLAUDE.md               # Claude Code設定
└── .claude/rules/          # Claude Codeルールファイル
```

## 既知の問題

- **Android Chrome WebGPU**: SmolVLMでクラッシュする報告あり ([transformers.js #1205](https://github.com/huggingface/transformers.js/issues/1205))。WASM(q4)への自動フォールバックで対応済み
- **初回ロード**: モデルのダウンロードに時間がかかる（256Mモデルで約200MB）。2回目以降はブラウザキャッシュから高速ロード
