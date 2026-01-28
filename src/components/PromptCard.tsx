type PromptCardProps = {
  purpose: string;
  isSubmitDisabled: boolean;
  isModelLoading: boolean;
  modelProgress: number;
  modelProgressText: string;
  modelStatus: "idle" | "loading" | "ready" | "error";
  onPurposeChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onOpenSettings: () => void;
};

export const PromptCard = ({
  purpose,
  isSubmitDisabled,
  isModelLoading,
  modelProgress,
  modelProgressText,
  modelStatus,
  onPurposeChange,
  onSubmit,
  onOpenSettings
}: PromptCardProps) => (
  <section className="card">
    <header className="card__header">
      <div className="card__header-top">
        <p className="eyebrow">WebLLM-powered naming</p>
        <button
          type="button"
          className="settings-button"
          aria-label="Open settings"
          onClick={onOpenSettings}
        >
          <span aria-hidden="true">⚙️</span>
        </button>
      </div>
      <h1>WebLLM Class Generator</h1>
      <p className="subtitle">
        Describe what your class does and get ten intricate class names.
      </p>
    </header>
    <form onSubmit={onSubmit} className="prompt">
      <label htmlFor="class-purpose">What is your class good for?</label>
      <div className="prompt__field">
        <textarea
          id="class-purpose"
          name="class-purpose"
          rows={3}
          value={purpose}
          onChange={(event) => onPurposeChange(event.target.value)}
          placeholder="Describe the class purpose"
          className="prompt__input"
        />
        <button
          type="submit"
          aria-label="Submit class purpose"
          disabled={isSubmitDisabled}
          className="prompt__submit"
        >
          {isModelLoading ? (
            <span aria-hidden="true" className="prompt__spinner" />
          ) : (
            <span aria-hidden="true">✨</span>
          )}
        </button>
      </div>
      {isModelLoading && (
        <div className="model-progress" aria-live="polite">
          <div className="model-progress__header">
            <span>Loading model…</span>
            <span>{Math.round(modelProgress * 100)}%</span>
          </div>
          <progress
            className="model-progress__bar"
            aria-label="Model loading progress"
            value={modelProgress}
            max={1}
          />
          <p className="model-progress__text">{modelProgressText}</p>
        </div>
      )}
      {modelStatus === "error" && (
        <p className="model-progress__error" role="alert">
          Unable to load the model. Please refresh to try again.
        </p>
      )}
    </form>
  </section>
);
