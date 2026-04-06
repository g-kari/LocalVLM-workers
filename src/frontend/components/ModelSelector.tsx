import { MODELS } from '../constants/models';

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
