import type { VlmStatus } from '../hooks/useVlm';

const MODELS = [
  { id: 'onnx-community/gemma-4-E2B-it-ONNX', label: 'Gemma 4 E2B' },
  { id: 'HuggingFaceTB/SmolVLM-256M-Instruct', label: 'SmolVLM-256M' },
  { id: 'HuggingFaceTB/SmolVLM-500M-Instruct', label: 'SmolVLM-500M' },
  { id: 'HuggingFaceTB/SmolVLM2-256M-Video-Instruct', label: 'SmolVLM2-256M' },
  { id: 'HuggingFaceTB/SmolVLM2-500M-Video-Instruct', label: 'SmolVLM2-500M' },
] as const;

interface Props {
  status: VlmStatus;
  modelId: string;
  device: 'webgpu' | 'wasm' | null;
  progress: number;
  onModelChange: (id: string) => void;
  onLoadModel: () => void;
  onCapture: () => void;
}

export function OverlayControls({
  status, modelId, device, progress,
  onModelChange, onLoadModel, onCapture,
}: Props) {
  const isModelBusy = status === 'loading' || status === 'running';

  return (
    <>
      {/* 上部: モデル選択 + 読み込み */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 90,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <select
          value={modelId}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={isModelBusy}
          style={{
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 6,
            padding: '6px 8px',
            fontSize: 13,
            flex: 1,
            maxWidth: 200,
          }}
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id} style={{ background: '#222' }}>
              {m.label}
            </option>
          ))}
        </select>

        <button
          onClick={onLoadModel}
          disabled={isModelBusy}
          style={{
            background: status === 'ready' || status === 'done' ? '#22c55e' : '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 13,
            cursor: isModelBusy ? 'not-allowed' : 'pointer',
            opacity: isModelBusy ? 0.6 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {status === 'loading' ? `${Math.round(progress)}%` :
            status === 'ready' || status === 'done' ? '✓ Ready' : 'Load'}
        </button>

        {device && (
          <span style={{
            fontSize: 11,
            color: device === 'webgpu' ? '#4ade80' : '#fbbf24',
            whiteSpace: 'nowrap',
          }}>
            {device === 'webgpu' ? '⚡GPU' : '🔄WASM'}
          </span>
        )}
      </div>

      {/* 撮影ボタン（中央下） */}
      <button
        onClick={onCapture}
        disabled={isModelBusy || (status !== 'ready' && status !== 'done')}
        style={{
          position: 'fixed',
          bottom: 200,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 90,
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: status === 'running'
            ? 'rgba(239,68,68,0.8)'
            : 'rgba(255,255,255,0.9)',
          border: '4px solid #fff',
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
          cursor: (status === 'ready' || status === 'done') ? 'pointer' : 'not-allowed',
          opacity: (status === 'ready' || status === 'done') ? 1 : 0.4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
        }}
      >
        {status === 'running' ? '⏳' : '📷'}
      </button>
    </>
  );
}
