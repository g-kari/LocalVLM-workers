const MODELS = [
  { id: 'onnx-community/gemma-4-E2B-it-ONNX', label: 'Gemma 4 E2B (2.3B) ⭐' },
  { id: 'HuggingFaceTB/SmolVLM-256M-Instruct', label: 'SmolVLM-256M (256M)' },
  { id: 'HuggingFaceTB/SmolVLM-500M-Instruct', label: 'SmolVLM-500M (500M)' },
  { id: 'HuggingFaceTB/SmolVLM2-256M-Video-Instruct', label: 'SmolVLM2-256M Video (256M)' },
  { id: 'HuggingFaceTB/SmolVLM2-500M-Video-Instruct', label: 'SmolVLM2-500M Video (500M)' },
] as const;

interface Props {
  modelId: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ modelId, onChange, disabled }: Props) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label>
        モデル選択:
        <select
          value={modelId}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          style={{ marginLeft: 8 }}
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
