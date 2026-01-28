import { CreateMLCEngine } from "@mlc-ai/web-llm";

type WebLlmMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type WebLlmChatCompletion = {
  choices: Array<{ message?: { content?: string } }>;
};

export type WebLlmEngine = {
  chat: {
    completions: {
      create: (payload: { messages: WebLlmMessage[] }) =>
        Promise<WebLlmChatCompletion>;
    };
  };
  resetChat: () => void;
};

export const createWebLlmEngine = async (modelId: string) =>
  (await CreateMLCEngine(modelId)) as WebLlmEngine;
