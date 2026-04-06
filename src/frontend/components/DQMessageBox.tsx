import { useEffect, useState } from 'react';

interface Props {
  text: string;
  visible: boolean;
}

function useTypewriter(text: string, speed: number): { displayed: string; isTyping: boolean } {
  const [state, setState] = useState({ displayed: '', index: 0, source: text });

  // text変更をstateで追跡し、intervalで1文字ずつ進める
  useEffect(() => {
    const timer = setInterval(() => {
      setState((prev) => {
        // テキストが変わったらリセット
        if (prev.source !== text) {
          return { displayed: '', index: 0, source: text };
        }
        // タイピング完了
        if (prev.index >= text.length) {
          clearInterval(timer);
          return prev;
        }
        // 1文字追加
        const nextIndex = prev.index + 1;
        return {
          displayed: text.slice(0, nextIndex),
          index: nextIndex,
          source: text,
        };
      });
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return {
    displayed: state.source === text ? state.displayed : '',
    isTyping: state.source === text && state.index < text.length,
  };
}

/** ドラクエ風メッセージウィンドウ（1文字ずつ表示） */
export function DQMessageBox({ text, visible }: Props) {
  const { displayed, isTyping } = useTypewriter(text, 30);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: 16,
      right: 16,
      zIndex: 100,
      background: '#0a0a2e',
      border: '4px solid #fff',
      borderRadius: 8,
      boxShadow: '0 0 0 4px #0a0a2e, 0 0 0 6px #5599ff, inset 0 0 20px rgba(50,100,255,0.15)',
      padding: '20px 24px',
      maxHeight: '40vh',
      overflow: 'auto',
    }}>
      <div style={{
        position: 'absolute', top: -2, left: -2, right: -2, bottom: -2,
        border: '2px solid #5599ff',
        borderRadius: 10,
        pointerEvents: 'none',
      }} />
      <p style={{
        color: '#fff',
        fontFamily: '"Hiragino Kaku Gothic ProN", "Noto Sans JP", monospace',
        fontSize: 18,
        lineHeight: 1.8,
        margin: 0,
        whiteSpace: 'pre-wrap',
        letterSpacing: '0.05em',
      }}>
        {displayed}
        {isTyping && <span style={{ opacity: 0.7 }}>▋</span>}
      </p>
      {!isTyping && text.length > 0 && (
        <div style={{ textAlign: 'right', marginTop: 8 }}>
          <span style={{
            color: '#5599ff',
            fontSize: 14,
            animation: 'blink 1s infinite',
          }}>
            ▼
          </span>
        </div>
      )}
    </div>
  );
}
