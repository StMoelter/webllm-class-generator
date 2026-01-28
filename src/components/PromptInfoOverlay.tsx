type PromptInfo = {
  prompt: string;
  temperature: number;
};

type PromptInfoOverlayProps = {
  isOpen: boolean;
  submission: PromptInfo | null;
  onClose: () => void;
};

export const PromptInfoOverlay = ({
  isOpen,
  submission,
  onClose
}: PromptInfoOverlayProps) => {
  if (!isOpen || !submission) {
    return null;
  }

  return (
    <div
      className="info-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompt-info-title"
      onClick={onClose}
    >
      <div className="info-panel" onClick={(event) => event.stopPropagation()}>
        <div className="info-panel__header">
          <h2 id="prompt-info-title">Last prompt details</h2>
          <button
            type="button"
            className="info-close"
            aria-label="Close prompt details"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="info-panel__body">
          <div className="info-panel__meta">
            <span>Temperature</span>
            <strong>{submission.temperature.toFixed(2)}</strong>
          </div>
          <label className="info-panel__label" htmlFor="prompt-preview">
            Prompt
          </label>
          <pre id="prompt-preview" className="info-panel__prompt">
            {submission.prompt}
          </pre>
        </div>
      </div>
    </div>
  );
};
