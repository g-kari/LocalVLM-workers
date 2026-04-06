import {
  AutoProcessor,
  Gemma4ForConditionalGeneration,
  RawImage,
  Tensor,
  type PreTrainedModel,
  type ProgressCallback,
} from '@huggingface/transformers';
import type { VlmWorkerRequest, VlmWorkerResponse } from '../../types/vlm';

/** transformers.jsのprocessorはPythonの__call__相当のcallableを持つが型定義では表現されていない */
interface CallableProcessor {
  apply_chat_template: (messages: unknown[], opts: Record<string, boolean>) => string;
  batch_decode: (tensor: Tensor, opts: Record<string, boolean>) => string[];
  // Gemma4Processorは (text, images, audio, opts) の順。audioはnullを渡す
  (text: string, images: RawImage[], audio: null, opts: Record<string, boolean>): Promise<{ input_ids: Tensor }>;
}

let processor: CallableProcessor | null = null;
let model: PreTrainedModel | null = null;
let currentDevice: 'webgpu' | 'wasm' = 'wasm';
let isLoading = false;

function post(msg: VlmWorkerResponse) {
  self.postMessage(msg);
}

function toErrorMessage(e: unknown): string {
  return toErrorMessage(e);
}

async function checkWebGPU(): Promise<boolean> {
  try {
    if (!('gpu' in self.navigator)) return false;
    const gpu = (self.navigator as unknown as { gpu: { requestAdapter: () => Promise<unknown | null> } }).gpu;
    const adapter = await gpu.requestAdapter();
    return adapter != null;
  } catch {
    return false;
  }
}

function makeProgressCallback(): ProgressCallback {
  const fileBytes = new Map<string, { loaded: number; total: number }>();

  return (p) => {
    if (!('progress' in p) || typeof p.progress !== 'number') return;
    const file = ('file' in p && typeof p.file === 'string') ? p.file : null;
    const loaded = ('loaded' in p && typeof p.loaded === 'number') ? p.loaded : 0;
    const total = ('total' in p && typeof p.total === 'number') ? p.total : 0;

    if (file && total > 0) {
      fileBytes.set(file, { loaded, total });
      let sumLoaded = 0;
      let sumTotal = 0;
      for (const { loaded: l, total: t } of fileBytes.values()) {
        sumLoaded += l;
        sumTotal += t;
      }
      post({ type: 'progress', progress: (sumLoaded / sumTotal) * 100 });
    } else {
      post({ type: 'progress', progress: p.progress });
    }
  };
}

async function loadModel(modelId: string) {
  if (isLoading) return;
  isLoading = true;

  // エラーリカバリ: 前回の壊れた状態をリセット
  processor = null;
  model = null;

  try {
    processor = await AutoProcessor.from_pretrained(modelId) as unknown as CallableProcessor;

    const hasWebGPU = await checkWebGPU();

    if (hasWebGPU) {
      try {
        model = await Gemma4ForConditionalGeneration.from_pretrained(modelId, {
          dtype: 'q4f16',
          device: 'webgpu',
          progress_callback: makeProgressCallback(),
        });
        currentDevice = 'webgpu';
        isLoading = false;
        post({ type: 'ready', device: 'webgpu' });
        return;
      } catch (e) {
        // Android Chrome WebGPUクラッシュ問題等 → WASMにフォールバック
        // 部分ロード済みモデルを明示的に解放してGCを待つ
        model = null;
        post({ type: 'progress', progress: 0 });
        console.warn('WebGPU failed, falling back to WASM:', e);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // WASMフォールバック
    model = await Gemma4ForConditionalGeneration.from_pretrained(modelId, {
      dtype: 'q4',
      device: 'wasm',
      progress_callback: makeProgressCallback(),
    });
    currentDevice = 'wasm';
    isLoading = false;
    post({ type: 'ready', device: 'wasm' });
  } catch (e) {
    processor = null;
    model = null;
    isLoading = false;
    post({ type: 'error', message: toErrorMessage(e) });
  }
}

async function runInference(imageData: ArrayBuffer, prompt: string) {
  if (!processor || !model) {
    post({ type: 'error', message: 'モデルが読み込まれていません' });
    return;
  }

  try {
    const blob = new Blob([imageData]);
    const image = await RawImage.fromBlob(blob);

    const messages = [
      {
        role: 'user' as const,
        content: [
          { type: 'image' as const },
          { type: 'text' as const, text: prompt },
        ],
      },
    ];

    const text = processor.apply_chat_template(messages, {
      add_generation_prompt: true,
    });

    const inputs = await processor(text, [image], null, {
      add_special_tokens: false,
    });

    const maxTokens = currentDevice === 'wasm' ? 128 : 256;

    // model.generateの戻り値はTensorまたは{ sequences: Tensor }
    const output = await (model.generate as unknown as (params: Record<string, unknown>) => Promise<Tensor>)({
      ...inputs,
      max_new_tokens: maxTokens,
    });

    const outputTensor = output instanceof Tensor
      ? output
      : (output as unknown as { sequences: Tensor }).sequences;

    // 入力トークン部分をスキップして生成部分のみをデコード
    const inputLength = inputs.input_ids.dims[1] ?? 0;
    const decoded = processor.batch_decode(
      outputTensor.slice(null, [inputLength, null] as unknown as [number, number]),
      { skip_special_tokens: true },
    );

    post({ type: 'result', text: decoded[0] ?? '' });
  } catch (e) {
    post({ type: 'error', message: toErrorMessage(e) });
  }
}

self.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
  e.preventDefault();
  isLoading = false;
  post({ type: 'error', message: toErrorMessage(e.reason) });
});

self.addEventListener('message', (e: MessageEvent<VlmWorkerRequest>) => {
  const msg = e.data;
  switch (msg.type) {
    case 'load':
      void loadModel(msg.modelId);
      break;
    case 'infer':
      void runInference(msg.imageData, msg.prompt);
      break;
  }
});
