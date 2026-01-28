import { CreateMLCEngine, type InitProgressReport } from "@mlc-ai/web-llm";

type WebLlmMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type WebLlmChatCompletion = {
  choices: Array<{ message?: { content?: string } }>;
};

type WebLlmChatCompletionChunk = {
  choices: Array<{ delta?: { content?: string } }>;
};

export type WebLlmEngine = {
  chat: {
    completions: {
      create: (payload: {
        messages: WebLlmMessage[];
        temperature?: number;
        max_tokens?: number;
        stream?: boolean;
      }) => Promise<WebLlmChatCompletion | AsyncIterable<WebLlmChatCompletionChunk>>;
    };
  };
  interruptGenerate?: () => Promise<void>;
  resetChat: () => void;
};

export const createWebLlmEngine = async (
  modelId: string,
  onProgress?: (report: InitProgressReport) => void
) =>
  (await CreateMLCEngine(
    modelId,
    onProgress ? { initProgressCallback: onProgress } : undefined
  )) as WebLlmEngine;
