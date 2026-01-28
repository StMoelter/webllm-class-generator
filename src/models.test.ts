import { describe, expect, it } from "vitest";
import { SUPPORTED_MODELS } from "./models";

describe("supported models", () => {
  it("includes the qwen coder model", () => {
    expect(SUPPORTED_MODELS).toEqual([
      expect.objectContaining({
        id: "Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC"
      })
    ]);
  });
});
