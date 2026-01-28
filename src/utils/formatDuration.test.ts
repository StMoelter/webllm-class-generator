import { describe, expect, it } from "vitest";
import { formatDuration } from "./formatDuration";

describe("formatDuration", () => {
  it("formats seconds under a minute", () => {
    expect(formatDuration(1200)).toBe("1.2s");
  });

  it("formats durations in minutes and seconds", () => {
    expect(formatDuration(65000)).toBe("1m 05s");
  });
});
