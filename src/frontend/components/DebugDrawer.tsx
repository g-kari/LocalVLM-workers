import { useEffect, useRef, useState, useCallback } from 'react';
import type { DebugLog } from '../hooks/useVlm';
import type { VlmStatus } from '../hooks/useVlm';

interface EnvInfo {
  userAgent: string;
  webnn: 'supported' | 'unsupported' | 'checking';
  webgpu: 'supported' | 'unsupported' | 'checking';
}

async function detectEnv(): Promise<EnvInfo> {
  const nav = navigator as unknown as {
    gpu?: { requestAdapter: () => Promise<unknown | null> };
    ml?: { createContext: (o: unknown) => Promise<unknown | null> };
  };

  const [webgpuOk, webnnOk] = await Promise.all([
    nav.gpu ? nav.gpu.requestAdapter().then(a => a != null).catch(() => false) : Promise.resolve(false),
    nav.ml ? nav.ml.createContext({ deviceType: 'npu' }).then(c => c != null).catch(() => false) : Promise.resolve(false),
  ]);

  return {
    userAgent: navigator.userAgent,
    webnn: webnnOk ? 'supported' : 'unsupported',
    webgpu: webgpuOk ? 'supported' : 'unsupported',
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  status: VlmStatus;
  modelId: string;
  device: 'webnn' | 'webgpu' | 'wasm' | null;
  progress: number;
  logs: DebugLog[];
}

function fmt(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

export function DebugDrawer({ open, onClose, status, modelId, device, progress, logs }: Props) {
  const logEndRef = useRef<HTMLDivElement>(null);
  const [env, setEnv] = useState<EnvInfo>({ userAgent: '', webnn: 'checking', webgpu: 'checking' });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void detectEnv().then(setEnv);
  }, []);

  const copyFlag = useCallback(() => {
    void navigator.clipboard.writeText('chrome://flags/#enable-webnn').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

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

        {/* 端末・ブラウザ対応状況 */}
        <div style={{
          padding: '8px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}>
          <div style={{ color: '#666', fontFamily: 'monospace', fontSize: 11, marginBottom: 4 }}>ENV</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            {([
              ['WebNN (NPU)', env.webnn],
              ['WebGPU', env.webgpu],
            ] as [string, string][]).map(([label, s]) => (
              <span key={label} style={{
                fontFamily: 'monospace', fontSize: 11,
                padding: '2px 6px', borderRadius: 4,
                background: s === 'supported' ? 'rgba(0,200,100,0.15)' : s === 'checking' ? 'rgba(255,200,0,0.1)' : 'rgba(255,60,60,0.1)',
                color: s === 'supported' ? '#4caf7d' : s === 'checking' ? '#b8a020' : '#e05555',
                border: `1px solid ${s === 'supported' ? '#2d6b47' : s === 'checking' ? '#6b5a10' : '#6b2525'}`,
              }}>
                {label}: {s}
              </span>
            ))}
          </div>
          {env.webnn === 'unsupported' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#666' }}>
                chrome://flags/#enable-webnn
              </span>
              <button
                onClick={copyFlag}
                style={{
                  background: copied ? 'rgba(0,200,100,0.15)' : 'rgba(85,153,255,0.15)',
                  border: `1px solid ${copied ? '#2d6b47' : 'rgba(85,153,255,0.4)'}`,
                  borderRadius: 4, color: copied ? '#4caf7d' : '#5599ff',
                  fontFamily: 'monospace', fontSize: 10,
                  padding: '2px 6px', cursor: 'pointer',
                }}
              >
                {copied ? 'copied!' : 'copy'}
              </button>
            </div>
          )}
          <div style={{
            fontFamily: 'monospace', fontSize: 10, color: '#555',
            wordBreak: 'break-all', lineHeight: 1.4,
          }}>
            {env.userAgent || '—'}
          </div>
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
