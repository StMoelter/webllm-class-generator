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

    const progressCallback = vi.fn();
    const engine = await createWebLlmEngine("model-id", progressCallback);

    expect(CreateMLCEngine).toHaveBeenCalledWith("model-id", {
      initProgressCallback: progressCallback
    });
    expect(engine).toBe(fakeEngine);
  });

  it("creates the engine without progress callback when none is provided", async () => {
    const fakeEngine = { chat: { completions: { create: vi.fn() } }, resetChat: vi.fn() };
    vi.mocked(CreateMLCEngine).mockResolvedValue(fakeEngine);

    const engine = await createWebLlmEngine("model-id");

    expect(CreateMLCEngine).toHaveBeenCalledWith("model-id", undefined);
    expect(engine).toBe(fakeEngine);
  });
});
