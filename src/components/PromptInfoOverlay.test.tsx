import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PromptInfoOverlay } from "./PromptInfoOverlay";

describe("PromptInfoOverlay", () => {
  const submission = { prompt: "Full prompt", temperature: 0.9 };

  it("renders prompt details when open", () => {
    render(
      <PromptInfoOverlay isOpen submission={submission} onClose={vi.fn()} />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/full prompt/i)).toBeInTheDocument();
    expect(screen.getByText("0.90")).toBeInTheDocument();
  });

  it("closes on backdrop click and close button", () => {
    const onClose = vi.fn();

    render(
      <PromptInfoOverlay isOpen submission={submission} onClose={onClose} />
    );

    fireEvent.click(screen.getByRole("button", { name: /close prompt details/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("does not render when closed or missing submission", () => {
    const { container: closedContainer } = render(
      <PromptInfoOverlay isOpen={false} submission={submission} onClose={vi.fn()} />
    );
    expect(closedContainer).toBeEmptyDOMElement();

    const { container: emptyContainer } = render(
      <PromptInfoOverlay isOpen submission={null} onClose={vi.fn()} />
    );
    expect(emptyContainer).toBeEmptyDOMElement();
  });
});
