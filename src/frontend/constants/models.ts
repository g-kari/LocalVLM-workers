export const MODELS = [
  { id: 'onnx-community/gemma-4-E2B-it-ONNX', label: 'Gemma 4 E2B' },
  { id: 'HuggingFaceTB/SmolVLM-256M-Instruct', label: 'SmolVLM-256M' },
  { id: 'HuggingFaceTB/SmolVLM-500M-Instruct', label: 'SmolVLM-500M' },
  { id: 'HuggingFaceTB/SmolVLM2-256M-Video-Instruct', label: 'SmolVLM2-256M' },
  { id: 'HuggingFaceTB/SmolVLM2-500M-Video-Instruct', label: 'SmolVLM2-500M' },
] as const;

export const DEFAULT_MODEL_ID = MODELS[0].id;
