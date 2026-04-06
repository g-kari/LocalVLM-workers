import {
  AutoProcessor,
  AutoModelForImageTextToText,
  RawImage,
  Tensor,
  type Processor,
  type PreTrainedModel,
  type ProgressCallback,
} from '@huggingface/transformers';
import type { VlmWorkerRequest, VlmWorkerResponse } from '../../types/vlm';

let processor: Processor | null = null;
let model: PreTrainedModel | null = null;
let currentDevice: 'webgpu' | 'wasm' = 'wasm';
let isLoading = false;

function post(msg: VlmWorkerResponse) {
  self.postMessage(msg);
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

async function loadModel(modelId: string) {
  if (isLoading) return;
  isLoading = true;

  // エラーリカバリ: 前回の壊れた状態をリセット
  processor = null;
  model = null;

  try {
    processor = await AutoProcessor.from_pretrained(modelId);

    const progressCallback: ProgressCallback = (p) => {
      if ('progress' in p && typeof p.progress === 'number') {
        post({ type: 'progress', progress: p.progress });
      }
    };

    const hasWebGPU = await checkWebGPU();

    if (hasWebGPU) {
      try {
        model = await AutoModelForImageTextToText.from_pretrained(modelId, {
          dtype: 'fp16',
          device: 'webgpu',
          progress_callback: progressCallback,
        });
        currentDevice = 'webgpu';
        isLoading = false;
        post({ type: 'ready', device: 'webgpu' });
        return;
      } catch (e) {
        // Android Chrome WebGPUクラッシュ問題等 → WASMにフォールバック
        // 部分ロード済みモデルを明示的に解放
        model = null;
        post({ type: 'progress', progress: 0 });
        console.warn('WebGPU failed, falling back to WASM:', e);
      }
    }

    // WASMフォールバック
    model = await AutoModelForImageTextToText.from_pretrained(modelId, {
      dtype: 'q4',
      device: 'wasm',
      progress_callback: progressCallback,
    });
    currentDevice = 'wasm';
    isLoading = false;
    post({ type: 'ready', device: 'wasm' });
  } catch (e) {
    processor = null;
    model = null;
    isLoading = false;
    post({ type: 'error', message: e instanceof Error ? e.message : String(e) });
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

    // transformers.jsのprocessorはPythonの__call__相当のcallableを持つ
    // TypeScript型定義では表現されていないためキャストが必要
    // apply_chat_templateも同様にランタイムでのみ利用可能
    const processorCallable = processor as unknown as {
      apply_chat_template: (messages: unknown[], opts: Record<string, boolean>) => string;
      batch_decode: (tensor: Tensor, opts: Record<string, boolean>) => string[];
      (text: string, images: RawImage[], opts: Record<string, boolean>): Promise<{ input_ids: Tensor }>;
    };

    const text = processorCallable.apply_chat_template(messages, {
      add_generation_prompt: true,
    });

    const inputs = await processorCallable(String(text), [image], {
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
    const decoded = processorCallable.batch_decode(
      outputTensor.slice(null, [inputLength, null] as unknown as [number, number]),
      { skip_special_tokens: true },
    );

    post({ type: 'result', text: decoded[0] ?? '' });
  } catch (e) {
    post({ type: 'error', message: e instanceof Error ? e.message : String(e) });
  }
}

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
