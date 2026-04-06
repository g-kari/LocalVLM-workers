import { useCallback, useEffect, useRef, useState } from 'react';

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<OffscreenCanvas | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsActive(true);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'カメラにアクセスできません');
    }
  }, []);

  const capture = useCallback(async (): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || !isActive) return null;

    const w = video.videoWidth;
    const h = video.videoHeight;

    if (!canvasRef.current || canvasRef.current.width !== w || canvasRef.current.height !== h) {
      canvasRef.current = new OffscreenCanvas(w, h);
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvasRef.current.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
  }, [isActive]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { videoRef, isActive, error, start, capture };
}
