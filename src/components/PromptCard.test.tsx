import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PromptCard } from "./PromptCard";

describe("PromptCard", () => {
  it("renders the header and form elements", () => {
    render(
      <PromptCard
        purpose=""
        isSubmitDisabled={false}
        isModelLoading={false}
        modelProgress={0}
        modelProgressText=""
        modelStatus="ready"
        onPurposeChange={vi.fn()}
        onSubmit={vi.fn()}
        onOpenSettings={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", { name: /webllm class generator/i })
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/what is your class good for/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open settings/i })
    ).toBeInTheDocument();
  });

  it("invokes callbacks for settings, input, and submit", () => {
    const onPurposeChange = vi.fn();
    const onSubmit = vi.fn();
    const onOpenSettings = vi.fn();

    render(
      <PromptCard
        purpose="initial"
        isSubmitDisabled={false}
        isModelLoading={false}
        modelProgress={0}
        modelProgressText=""
        modelStatus="ready"
        onPurposeChange={onPurposeChange}
        onSubmit={onSubmit}
        onOpenSettings={onOpenSettings}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /open settings/i }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText(/what is your class good for/i), {
      target: { value: "changed" }
    });
    expect(onPurposeChange).toHaveBeenCalledWith("changed");

    fireEvent.submit(
      screen.getByLabelText(/what is your class good for/i).closest("form") as
        HTMLFormElement
    );
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("shows model progress and error states", () => {
    const { rerender } = render(
      <PromptCard
        purpose=""
        isSubmitDisabled
        isModelLoading
        modelProgress={0.4}
        modelProgressText="Downloading"
        modelStatus="loading"
        onPurposeChange={vi.fn()}
        onSubmit={vi.fn()}
        onOpenSettings={vi.fn()}
      />
    );

    expect(
      screen.getByRole("progressbar", { name: /model loading progress/i })
    ).toHaveAttribute("value", "0.4");
    expect(screen.getByText(/downloading/i)).toBeInTheDocument();

    rerender(
      <PromptCard
        purpose=""
        isSubmitDisabled
        isModelLoading={false}
        modelProgress={0}
        modelProgressText=""
        modelStatus="error"
        onPurposeChange={vi.fn()}
        onSubmit={vi.fn()}
        onOpenSettings={vi.fn()}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/unable to load/i);
  });
});
