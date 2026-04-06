# LocalVLM-workers 学習ガイド

ブラウザ上でVLMをエッジ実行するアーキテクチャを通して学べる技術まとめ。

---

## 1. 全体アーキテクチャ

```mermaid
graph TD
    User["👤 ユーザー (Pixel 8 Chrome)"]
    App["React SPA<br/>App.tsx"]
    Hooks["Hooks層<br/>useVlm / useCamera"]
    Worker["Web Worker<br/>vlm.worker.ts"]
    TJS["transformers.js<br/>@huggingface/transformers"]
    WebGPU["WebGPU<br/>dtype: q4f16"]
    WASM["WASM<br/>dtype: q4"]
    Cache["Browser Cache API<br/>モデルキャッシュ"]
    HF["HuggingFace Hub<br/>初回ダウンロード"]
    CF["Cloudflare Pages<br/>SPAホスティング"]

    User -->|カメラ・ボタン操作| App
    App -->|状態管理| Hooks
    Hooks -->|postMessage| Worker
    Worker -->|from_pretrained| TJS
    TJS -->|GPU利用可能| WebGPU
    TJS -->|GPUクラッシュ時| WASM
    TJS -->|初回| HF
    TJS -->|2回目以降| Cache
    Worker -->|推論結果| Hooks
    Hooks -->|テキスト表示| App
    CF -->|SPA配信| User
```

**ポイント**: サーバーサイド推論ゼロ。ブラウザだけで完結する。

---

## 2. Web Worker 通信設計

UIスレッドをブロックしないために推論をWorkerに分離。

```mermaid
sequenceDiagram
    participant Main as メインスレッド<br/>(useVlm.ts)
    participant Worker as Web Worker<br/>(vlm.worker.ts)
    participant TJS as transformers.js

    Main->>Worker: postMessage({ type: 'load', modelId })
    Worker->>TJS: AutoProcessor.from_pretrained()
    Worker->>TJS: Gemma4ForConditionalGeneration.from_pretrained()
    TJS-->>Worker: progress callback (0→100%)
    Worker-->>Main: postMessage({ type: 'progress', progress: N })
    Worker-->>Main: postMessage({ type: 'ready', device: 'webgpu' })

    Main->>Worker: postMessage({ type: 'infer', imageData, prompt }, [imageData])
    Note over Main,Worker: ArrayBuffer転送(コピーなし)
    Worker->>TJS: processor(text, image, null, opts)
    Worker->>TJS: model.generate({ ...inputs })
    Worker-->>Main: postMessage({ type: 'result', text })
```

### TypeScript で型安全にする

```typescript
// types/vlm.ts
type VlmWorkerRequest = VlmLoadMessage | VlmInferMessage;
type VlmWorkerResponse = VlmProgressResponse | VlmReadyResponse | VlmResultResponse | VlmErrorResponse;

// vlm.worker.ts — discriminated union で型が絞られる
self.addEventListener('message', (e: MessageEvent<VlmWorkerRequest>) => {
  switch (e.data.type) {
    case 'load':  e.data.modelId  // string 確定
    case 'infer': e.data.imageData // ArrayBuffer 確定
  }
});
```

**`[imageData]` を postMessage の第2引数に渡す** → `Transferable` として所有権移譲。メモリコピーなし。

---

## 3. WebGPU / WASM フォールバック戦略

Android Chrome は WebGPU が不安定なため、自動フォールバックを実装。

```mermaid
flowchart TD
    Start([モデルロード開始]) --> Check{navigator.gpu\n存在する?}
    Check -->|No| WASM
    Check -->|Yes| Adapter{requestAdapter()\n成功?}
    Adapter -->|No| WASM
    Adapter -->|Yes| TryGPU[WebGPU でロード\ndtype: q4f16]
    TryGPU --> GPUResult{成功?}
    GPUResult -->|Yes| ReadyGPU([✅ ready: webgpu])
    GPUResult -->|No: クラッシュ等| Reset[model = null\n500ms 待機 GC]
    Reset --> WASM[WASM でロード\ndtype: q4]
    WASM --> ReadyWASM([✅ ready: wasm])
```

| | WebGPU | WASM |
|---|---|---|
| dtype | q4f16 | q4 |
| 最大トークン | 256 | 128 |
| 速度 | 速い | 遅い |
| 安定性 | Androidで不安定 | 安定 |

---

## 4. Gemma4Processor の正しい使い方

公式ドキュメントには載っていない落とし穴が複数あった。

```mermaid
flowchart LR
    A["apply_chat_template(messages, {\n  enable_thinking: false,\n  add_generation_prompt: true\n})"] --> B["processor(text, image, null, {\n  add_special_tokens: false\n})"]
    B --> C["model.generate({\n  ...inputs,\n  max_new_tokens: N\n})"]
    C --> D["batch_decode(\n  output.slice(null, [inputLen, null]),\n  { skip_special_tokens: true }\n)"]
```

### 落とし穴まとめ

| 問題 | 原因 | 解決 |
|------|------|------|
| `AudioFeatureExtractor` エラー | `processor(text, [image], opts)` — opts が audio 引数に入った | `processor(text, image, null, opts)` に修正 |
| 命令文が出力に混入 | `enable_thinking: false` 未指定でthinkingモードON | `apply_chat_template` に `enable_thinking: false` 追加 |
| `processor` の型定義がない | transformers.js は `__call__` を型定義していない | `CallableProcessor` インターフェースを自前定義 |

### 正しいシグネチャ

```typescript
// Gemma4Processor._call の実際の引数順
// (text, images, audio, options)
interface CallableProcessor {
  (text: string, image: RawImage, audio: null, opts: Record<string, boolean>): Promise<{ input_ids: Tensor }>;
  apply_chat_template(messages: unknown[], opts: Record<string, boolean>): string;
  batch_decode(tensor: Tensor, opts: Record<string, boolean>): string[];
}
```

---

## 5. Camera API + OffscreenCanvas

```mermaid
sequenceDiagram
    participant Hook as useCamera.ts
    participant Browser as ブラウザ
    participant Worker as Web Worker

    Hook->>Browser: getUserMedia({ video: { facingMode: 'environment' } })
    Browser-->>Hook: MediaStream
    Hook->>Browser: video.srcObject = stream
    Note over Hook: 撮影ボタン押下
    Hook->>Browser: OffscreenCanvas.getContext('2d')
    Hook->>Browser: ctx.drawImage(video, 0, 0)
    Hook->>Browser: canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 })
    Browser-->>Hook: Blob
    Hook->>Worker: resizeImage → ArrayBuffer → postMessage([buf])
```

- `facingMode: 'environment'` でリアカメラ指定（Pixel 8対応）
- `OffscreenCanvas` でメインスレッドをブロックせずフレーム取得
- `512px` にリサイズしてから推論（VRAMと速度を節約）

---

## 6. Cloudflare Pages デプロイ

```mermaid
graph LR
    Dev["ローカル開発\nnpm run dev"] -->|git push main| GitHub
    GitHub -->|Webhook| CF["Cloudflare Pages\nnpm run build"]
    CF -->|dist/| CDN["CDN エッジ配信\nLocalVLM-workers.0g0.xyz"]
    CDN -->|SPA + 静的ファイル| User["ユーザー"]

    subgraph "ビルド成果物 dist/"
        HTML["index.html"]
        JS["assets/index-*.js\nassets/vlm.worker-*.js"]
        WASM2["ort-wasm-simd-threaded.wasm\n~23MB"]
    end
```

- GitHub Actions は **使わない**。Cloudflare の自動ビルドのみ
- WASM ファイルが大きい (~23MB) → CDNキャッシュが効く
- `wrangler.toml` の `[assets]` でSPA配信を設定

---

## 7. React Hooks 設計

```mermaid
graph TD
    App["App.tsx"] --> useVlm["useVlm()\nWorker管理・状態管理"]
    App --> useCamera["useCamera()\nMediaStream管理"]

    useVlm --> State["status: VlmStatus\nresult: string\nprogress: number\ndevice: string\nlogs: LogEntry[]"]
    useVlm --> Worker["new Worker(...)\n{ type: 'module' }"]

    useCamera --> Stream["MediaStream\nvideo要素バインド"]
    useCamera --> Capture["capture()\n→ Blob"]
```

### VlmStatus 状態遷移

```mermaid
stateDiagram-v2
    [*] --> idle
    idle --> loading: loadModel()
    loading --> ready: Worker ready
    loading --> error: ロード失敗
    ready --> running: runInference()
    running --> done: 推論完了
    running --> error: 推論失敗
    done --> running: 再度撮影
    error --> loading: 再ロード
```

---

## 8. 学習ロードマップ

```mermaid
graph LR
    A["Web Worker API\nメッセージパッシング"] --> B["WebGPU API\nGPU利用可否チェック"]
    B --> C["transformers.js\nONNXモデル実行"]
    C --> D["Gemma4 マルチモーダル\nProcessor引数の罠"]

    E["Camera API\ngetUserMedia"] --> F["OffscreenCanvas\n非同期フレームキャプチャ"]
    F --> G["ArrayBuffer Transferable\nゼロコピー転送"]

    H["TypeScript\nDiscriminated Union"] --> I["型安全なWorker通信\nMessageEvent<T>"]

    J["Vite\nWorkerビルド設定"] --> K["Cloudflare Pages\n自動デプロイ"]
```

### 優先度

| 優先度 | 技術 | 理由 |
|--------|------|------|
| ⭐⭐⭐ | Web Worker + Transferable | ブラウザ並行処理の基礎 |
| ⭐⭐⭐ | transformers.js の推論パイプライン | このプロジェクトの核心 |
| ⭐⭐ | WebGPU / WASMフォールバック | モバイル対応の実践知識 |
| ⭐⭐ | Camera API + OffscreenCanvas | メディア系Webアプリ全般で使える |
| ⭐ | Cloudflare Pages デプロイ | セットアップは済んでいる |
