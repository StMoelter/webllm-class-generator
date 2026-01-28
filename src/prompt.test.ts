import { describe, expect, it } from "vitest";
import { buildPrompt, CLASS_PURPOSE_PLACEHOLDER, PROMPT_TEMPLATE } from "./prompt";

describe("prompt", () => {
  it("includes the placeholder in the template", () => {
    expect(PROMPT_TEMPLATE).toContain(CLASS_PURPOSE_PLACEHOLDER);
  });

  it("replaces the placeholder with the trimmed purpose", () => {
    const prompt = buildPrompt("  backend services  ");

    expect(prompt).toContain("backend services");
    expect(prompt).not.toContain(CLASS_PURPOSE_PLACEHOLDER);
  });
});
