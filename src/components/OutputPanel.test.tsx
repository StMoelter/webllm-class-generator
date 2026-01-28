import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OutputPanel } from "./OutputPanel";

describe("OutputPanel", () => {
  const formatDuration = (value: number) => `${value}ms`;

  it("renders the idle state", () => {
    render(
      <OutputPanel
        status="idle"
        output=""
        errorMessage=""
        hasSubmission={false}
        generationElapsedMs={0}
        generationDurationMs={null}
        formatDuration={formatDuration}
        onShowPromptInfo={vi.fn()}
      />
    );

    expect(
      screen.getByText(/submit a class purpose/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /show last prompt details/i })
    ).not.toBeInTheDocument();
  });

  it("renders loading state with timer", () => {
    render(
      <OutputPanel
        status="loading"
        output=""
        errorMessage=""
        hasSubmission
        generationElapsedMs={1200}
        generationDurationMs={null}
        formatDuration={formatDuration}
        onShowPromptInfo={vi.fn()}
      />
    );

    expect(screen.getByText(/generating class names/i)).toBeInTheDocument();
    expect(screen.getByText(/thinking for 1200ms/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /show last prompt details/i })
    ).toBeInTheDocument();
  });

  it("renders error and success output", () => {
    const onShowPromptInfo = vi.fn();

    const { rerender } = render(
      <OutputPanel
        status="error"
        output=""
        errorMessage="Failure"
        hasSubmission
        generationElapsedMs={0}
        generationDurationMs={null}
        formatDuration={formatDuration}
        onShowPromptInfo={onShowPromptInfo}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Failure");

    rerender(
      <OutputPanel
        status="success"
        output="Result"
        errorMessage=""
        hasSubmission
        generationElapsedMs={0}
        generationDurationMs={2000}
        formatDuration={formatDuration}
        onShowPromptInfo={onShowPromptInfo}
      />
    );

    expect(screen.getByText(/generation time: 2000ms/i)).toBeInTheDocument();
    expect(screen.getByText("Result")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /show last prompt details/i })
    );
    expect(onShowPromptInfo).toHaveBeenCalledTimes(1);
  });
});
