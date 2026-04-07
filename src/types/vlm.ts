export interface VlmLoadMessage {
  type: 'load';
  modelId: string;
}

export interface VlmInferMessage {
  type: 'infer';
  imageData: ArrayBuffer;
  prompt: string;
}

export type VlmWorkerRequest = VlmLoadMessage | VlmInferMessage;

export interface VlmProgressResponse {
  type: 'progress';
  progress: number;
}

export interface VlmReadyResponse {
  type: 'ready';
  device: 'webnn' | 'webgpu' | 'wasm';
}

export interface VlmResultResponse {
  type: 'result';
  text: string;
}

export interface VlmErrorResponse {
  type: 'error';
  message: string;
}

export type VlmWorkerResponse =
  | VlmProgressResponse
  | VlmReadyResponse
  | VlmResultResponse
  | VlmErrorResponse;
