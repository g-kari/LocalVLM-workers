import { useEffect } from 'react';
import { DQMessageBox } from './components/DQMessageBox';
import { OverlayControls } from './components/OverlayControls';
import { useVlm } from './hooks/useVlm';
import { useCamera } from './hooks/useCamera';

const PROMPT = 'Describe this image in detail.';

export function App() {
  const { status, modelId, setModelId, loadModel, runInference, result, progress, device } = useVlm();
  const { videoRef, isActive, error: cameraError, start, capture } = useCamera();

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
