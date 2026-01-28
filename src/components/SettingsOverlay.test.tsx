import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsOverlay } from "./SettingsOverlay";

describe("SettingsOverlay", () => {
  it("renders when open and triggers save", () => {
    const onSave = vi.fn();

    render(
      <SettingsOverlay
        isOpen
        draftPromptTemplate="Template"
        draftTemperature={0.5}
        onDraftPromptTemplateChange={vi.fn()}
        onDraftTemperatureChange={vi.fn()}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("closes on backdrop click but not on panel click", () => {
    const onClose = vi.fn();

    render(
      <SettingsOverlay
        isOpen
        draftPromptTemplate="Template"
        draftTemperature={0.5}
        onDraftPromptTemplateChange={vi.fn()}
        onDraftTemperatureChange={vi.fn()}
        onClose={onClose}
        onSave={vi.fn()}
      />
    );

    const dialog = screen.getByRole("dialog");
    fireEvent.click(screen.getByRole("heading", { name: /settings/i }));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not render when closed", () => {
    const { container } = render(
      <SettingsOverlay
        isOpen={false}
        draftPromptTemplate="Template"
        draftTemperature={0.5}
        onDraftPromptTemplateChange={vi.fn()}
        onDraftTemperatureChange={vi.fn()}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
