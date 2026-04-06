import type { VlmStatus } from '../hooks/useVlm';

interface Props {
  status: VlmStatus;
  result: string;
}

export function ChatOutput({ status, result }: Props) {
  return (
    <div style={{ marginTop: 16 }}>
      <h3>結果</h3>
      {status === 'idle' && <p>モデルを読み込んでください</p>}
      {status === 'loading' && <p>モデル読み込み中...</p>}
      {status === 'ready' && <p>画像を選択して推論を開始してください</p>}
      {status === 'running' && <p>推論中...</p>}
      {status === 'done' && (
        <pre style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
          {result}
        </pre>
      )}
      {status === 'error' && (
        <pre style={{ whiteSpace: 'pre-wrap', background: '#fff0f0', padding: 12, borderRadius: 4, color: 'red' }}>
          {result}
        </pre>
      )}
    </div>
  );
}
