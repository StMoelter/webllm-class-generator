export const SUPPORTED_MODELS = [
  {
    id: "Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC",
    label: "Qwen2.5-Coder-0.5B Instruct (Q4F16_1)",
    source:
      "https://huggingface.co/mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC"
  }
] as const;

export type SupportedModel = (typeof SUPPORTED_MODELS)[number];
