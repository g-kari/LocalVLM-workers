import { useEffect, useRef } from 'react';
import type { DebugLog } from '../hooks/useVlm';
import type { VlmStatus } from '../hooks/useVlm';

interface Props {
  open: boolean;
  onClose: () => void;
  status: VlmStatus;
  modelId: string;
  device: 'webgpu' | 'wasm' | null;
  progress: number;
  logs: DebugLog[];
}

function fmt(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

export function DebugDrawer({ open, onClose, status, modelId, device, progress, logs }: Props) {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, open]);

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 199,
            background: 'rgba(0,0,0,0.4)',
          }}
        />
      )}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 200,
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.25s ease',
        background: '#0d0d1a',
        border: '1px solid rgba(85,153,255,0.3)',
        borderBottom: 'none',
        borderRadius: '12px 12px 0 0',
        maxHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* ヘッダー */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px 8px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}>
          <span style={{ color: '#5599ff', fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold' }}>
            DEBUG
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#aaa',
              fontSize: 18, cursor: 'pointer', padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* ステータスパネル */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 8, padding: '8px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}>
          {([
            ['status', status],
            ['device', device ?? 'none'],
            ['progress', `${Math.round(progress)}%`],
            ['model', modelId.split('/').pop() ?? modelId],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} style={{ fontFamily: 'monospace', fontSize: 12 }}>
              <span style={{ color: '#666' }}>{k}: </span>
              <span style={{ color: '#e0e0e0' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* ログ */}
        <div style={{
          overflowY: 'auto', flex: 1,
          padding: '8px 16px 16px',
          fontFamily: 'monospace', fontSize: 12,
        }}>
          {logs.length === 0 && (
            <span style={{ color: '#555' }}>ログなし</span>
          )}
          {logs.map((log) => (
            <div key={log.ts} style={{ marginBottom: 4, color: '#ccc', lineHeight: 1.5 }}>
              <span style={{ color: '#555', marginRight: 8 }}>{fmt(log.ts)}</span>
              {log.msg}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    </>
  );
}
