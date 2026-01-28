type SettingsOverlayProps = {
  isOpen: boolean;
  draftPromptTemplate: string;
  draftTemperature: number;
  onDraftPromptTemplateChange: (value: string) => void;
  onDraftTemperatureChange: (value: number) => void;
  onClose: () => void;
  onSave: () => void;
};

export const SettingsOverlay = ({
  isOpen,
  draftPromptTemplate,
  draftTemperature,
  onDraftPromptTemplateChange,
  onDraftTemperatureChange,
  onClose,
  onSave
}: SettingsOverlayProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="settings-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      onClick={onClose}
    >
      <div className="settings-panel" onClick={(event) => event.stopPropagation()}>
        <div className="settings-panel__header">
          <h2 id="settings-title">Settings</h2>
          <button
            type="button"
            className="settings-close"
            aria-label="Close settings"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="settings-panel__body">
          <label htmlFor="prompt-template">Prompt template</label>
          <textarea
            id="prompt-template"
            name="prompt-template"
            rows={6}
            value={draftPromptTemplate}
            onChange={(event) => onDraftPromptTemplateChange(event.target.value)}
          />
          <p className="settings-panel__hint">
            Use {"{{CLASS_PURPOSE}}"} as the placeholder for the class description.
          </p>
          <label htmlFor="temperature">Temperature</label>
          <div className="settings-panel__slider">
            <input
              id="temperature"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={draftTemperature}
              onChange={(event) => onDraftTemperatureChange(Number(event.target.value))}
            />
            <span>{draftTemperature.toFixed(2)}</span>
          </div>
        </div>
        <div className="settings-panel__actions">
          <button type="button" className="settings-save" onClick={onSave}>
            Save settings
          </button>
        </div>
      </div>
    </div>
  );
};
