import { beforeEach, describe, expect, it, vi } from "vitest";
import ReactDOM from "react-dom/client";

const renderMock = vi.fn();

vi.mock("react-dom/client", () => ({
  default: {
    createRoot: vi.fn(() => ({
      render: renderMock
    }))
  }
}));

describe("main entry", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    renderMock.mockClear();
    vi.mocked(ReactDOM.createRoot).mockClear();
    vi.resetModules();
  });

  it("renders the application into the root element", async () => {
    document.body.innerHTML = "<div id=\"root\"></div>";

    await import("./main");

    expect(ReactDOM.createRoot).toHaveBeenCalledTimes(1);
    expect(renderMock).toHaveBeenCalledTimes(1);
  });

  it("throws if the root element is missing", async () => {
    await expect(import("./main")).rejects.toThrow("Root element not found");
  });
});
