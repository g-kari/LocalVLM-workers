import { useState } from 'react';
import { ModelSelector } from './components/ModelSelector';
import { ImageInput } from './components/ImageInput';
import { ChatOutput } from './components/ChatOutput';
import { useVlm } from './hooks/useVlm';

export function App() {
  const [prompt, setPrompt] = useState('この画像を説明してください');
  const { status, modelId, setModelId, loadModel, runInference, result, progress, device } = useVlm();

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 16 }}>
      <h1>LocalVLM</h1>
      <p>ブラウザ上でVLMを動作させる検証環境</p>

      <ModelSelector modelId={modelId} onChange={setModelId} />

      <button
        onClick={loadModel}
        disabled={status === 'loading' || status === 'running'}
      >
        {status === 'loading' ? `モデル読み込み中... ${Math.round(progress)}%` : 'モデルを読み込む'}
      </button>

      {device && (
        <span style={{ marginLeft: 8, fontSize: 12, color: device === 'webgpu' ? 'green' : 'orange' }}>
          {device === 'webgpu' ? '⚡ WebGPU' : '🔄 WASM (フォールバック)'}
        </span>
      )}

      <hr />

      <ImageInput
        onImageSelect={(image) => {
          runInference(image, prompt);
        }}
        disabled={status !== 'ready' && status !== 'done'}
      />

      <div style={{ marginTop: 8 }}>
        <label>
          プロンプト:
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            style={{ width: '100%', marginTop: 4 }}
          />
        </label>
      </div>

      <ChatOutput status={status} result={result} />
    </div>
  );
}
