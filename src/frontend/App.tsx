import { useEffect, useState } from 'react';
import { DQMessageBox } from './components/DQMessageBox';
import { DebugDrawer } from './components/DebugDrawer';
import { OverlayControls } from './components/OverlayControls';
import { useVlm } from './hooks/useVlm';
import { useCamera } from './hooks/useCamera';

const PROMPT =
  'Describe what you see in this image in the style of a Dragon Quest "Book of Adventure" (冒険のしょ) save file entry. ' +
  'Use simple Japanese with lots of hiragana, short punchy sentences, and a dramatic RPG narrator tone. ' +
  'Example style: "そこには おおきな まちが あった。たくさんの ひとびとが にぎやかに くらしている。ゆうしゃは しずかに まちを みわたした。" ' +
  'Keep it under 60 Japanese characters.';

export function App() {
  const { status, modelId, setModelId, loadModel, runInference, result, progress, device, logs } = useVlm();
  const { videoRef, isActive, error: cameraError, start, capture } = useCamera();
  const [debugOpen, setDebugOpen] = useState(false);

  // カメラ自動起動
  useEffect(() => {
    void start();
  }, [start]);

  const handleCapture = async () => {
    const blob = await capture();
    if (!blob) return;
    const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
    void runInference(file, PROMPT);
  };

  const showMessage = status === 'done' || status === 'error' || status === 'running' || status === 'loading';
  const messageText =
    status === 'loading' ? (progress >= 100 ? 'モデルを初期化しています...' : 'モデルを読み込んでいます...') :
    status === 'running' ? 'しばらくおまちください...' :
    status === 'error' ? `エラーが発生しました:\n${result}` :
    result || '';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#000',
      overflow: 'hidden',
    }}>
      {/* 全画面カメラプレビュー */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      {/* カメラエラー表示 */}
      {cameraError && !isActive && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#fff',
          textAlign: 'center',
          zIndex: 80,
        }}>
          <p style={{ fontSize: 18 }}>📷 {cameraError}</p>
          <button
            onClick={() => void start()}
            style={{
              marginTop: 12,
              padding: '8px 24px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            再試行
          </button>
        </div>
      )}

      {/* 上部コントロール + 撮影ボタン */}
      <OverlayControls
        status={status}
        modelId={modelId}
        device={device}
        progress={progress}
        showMessage={showMessage}
        onModelChange={setModelId}
        onLoadModel={loadModel}
        onCapture={() => void handleCapture()}
      />

      {/* ドラクエ風メッセージウィンドウ */}
      <DQMessageBox text={messageText} visible={showMessage} progress={status === 'loading' ? progress : undefined} />

      {/* ライセンス帰属表示 */}
      <div style={{
        position: 'fixed', bottom: 16, left: 16, zIndex: 100,
        color: 'rgba(255,255,255,0.35)', fontSize: 10,
        fontFamily: 'monospace', pointerEvents: 'none',
        lineHeight: 1.4,
      }}>
        Powered by Gemma 4 E2B<br />
        © Google DeepMind (Gemma Terms of Use)
      </div>

      {/* デバッグボタン */}
      <button
        onClick={() => setDebugOpen(true)}
        style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 150,
          background: 'rgba(0,0,0,0.6)', color: '#5599ff',
          border: '1px solid rgba(85,153,255,0.4)',
          borderRadius: 8, padding: '6px 10px',
          fontFamily: 'monospace', fontSize: 12, cursor: 'pointer',
        }}
      >
        DBG
      </button>

      <DebugDrawer
        open={debugOpen}
        onClose={() => setDebugOpen(false)}
        status={status}
        modelId={modelId}
        device={device}
        progress={progress}
        logs={logs}
      />

      {/* グローバルスタイル */}
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>
    </div>
  );
}
