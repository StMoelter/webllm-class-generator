import { describe, expect, it, vi } from "vitest";
import { createWebLlmEngine } from "./webllmClient";
import { CreateMLCEngine } from "@mlc-ai/web-llm";

vi.mock("@mlc-ai/web-llm", () => ({
  CreateMLCEngine: vi.fn()
}));

describe("createWebLlmEngine", () => {
  it("delegates to CreateMLCEngine", async () => {
    const fakeEngine = { chat: { completions: { create: vi.fn() } }, resetChat: vi.fn() };
    vi.mocked(CreateMLCEngine).mockResolvedValue(fakeEngine);

    const engine = await createWebLlmEngine("model-id");

    expect(CreateMLCEngine).toHaveBeenCalledWith("model-id");
    expect(engine).toBe(fakeEngine);
  });
});
