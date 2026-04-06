# VLM関連ルール

## 対象デバイス

- **Pixel 8**（Google Tensor G3, RAM 8GB, Android Chrome）
- WebGPU優先、非対応/クラッシュ時はWASM(q4)にフォールバック

## モデル選定基準

- HuggingFace Hub上にあり、transformers.js v3でONNX変換済みであること
- Pixel 8のRAM 8GBで推論が完了すること（4bit量子化時~1.5GB以下が目安）
- 推奨モデル:
  - **Gemma 4 E2B** ⭐ — Google製、実効2.3B。マルチモーダル。ONNX変換済み（`onnx-community/gemma-4-E2B-it-ONNX`）。4bit量子化で~1.5GB。Pixel最適化済み
  - **SmolVLM-256M-Instruct** — 最軽量、1GB未満で推論可能
  - **SmolVLM-500M-Instruct** — 256Mより高精度
  - **SmolVLM2-256M-Video-Instruct** — 動画対応版
  - **SmolVLM2-500M-Video-Instruct** — 動画対応版、高精度
- 除外:
  - moondream2（1.86B、メモリ9-10GB必要でPixel 8では動作不安定）

## 既知の問題

- Android Chrome WebGPUでSmolVLMがクラッシュする報告あり（[transformers.js #1205](https://github.com/huggingface/transformers.js/issues/1205)）
- 対策: WebGPU(fp16)で試行→失敗時にWASM(q4)へ自動フォールバック

## 実装方針

- モデルの推論はWeb Worker内で`@huggingface/transformers`を使って実行
- WebGPU対応チェックはWorker内で`navigator.gpu.requestAdapter()`で確認
- WebGPU失敗時は`device: 'wasm'`, `dtype: 'q4'`にフォールバック
- WASMモードではmax_new_tokensを128に制限（速度確保）
- モデルのダウンロード進捗はprogressCallbackでUIに反映
- キャッシュはブラウザのCache API / OPFSを利用（transformers.jsのデフォルト挙動）
- 画像入力はカメラ（MediaDevices API）またはファイルアップロードに対応
