import { useCallback, useEffect, useRef, useState } from 'react';
import type { VlmWorkerResponse } from '../../types/vlm';
import { DEFAULT_MODEL_ID } from '../constants/models';

export type VlmStatus = 'idle' | 'loading' | 'ready' | 'running' | 'done' | 'error';

const MAX_IMAGE_SIZE = 512;

/** 画像をcanvasでリサイズしてBlobに変換（Pixel 8の12.2MPカメラ対策） */
async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  if (width <= MAX_IMAGE_SIZE && height <= MAX_IMAGE_SIZE) {
    bitmap.close();
    return file;
  }

  const scale = MAX_IMAGE_SIZE / Math.max(width, height);
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
}

export function useVlm() {
  const [status, setStatus] = useState<VlmStatus>('idle');
  const [modelId, setModelId] = useState<string>(DEFAULT_MODEL_ID);
  const [result, setResult] = useState('');
  const [progress, setProgress] = useState(0);
  const [device, setDevice] = useState<'webgpu' | 'wasm' | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../workers/vlm.worker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current.addEventListener('message', (e: MessageEvent<VlmWorkerResponse>) => {
        const msg = e.data;
        switch (msg.type) {
          case 'progress':
            setProgress(msg.progress);
            break;
          case 'ready':
            setStatus('ready');
            setProgress(100);
            setDevice(msg.device);
            break;
          case 'result':
            setStatus('done');
            setResult(msg.text);
            break;
          case 'error':
            setStatus('error');
            setResult(msg.message);
            break;
        }
      });
    }
    return workerRef.current;
  }, []);

  // Worker cleanup
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const loadModel = useCallback(() => {
    setStatus('loading');
    setProgress(0);
    setDevice(null);
    getWorker().postMessage({ type: 'load', modelId });
  }, [getWorker, modelId]);

  const runInference = useCallback(
    async (imageFile: File, prompt: string) => {
      setStatus('running');
      setResult('');
      const resized = await resizeImage(imageFile);
      const buffer = await resized.arrayBuffer();
      getWorker().postMessage(
        { type: 'infer', imageData: buffer, prompt },
        [buffer]
      );
    },
    [getWorker]
  );

  return { status, modelId, setModelId, loadModel, runInference, result, progress, device };
}
