import type { ReactNode } from "react";

type GenerationStatus = "idle" | "loading" | "success" | "error";

type OutputPanelProps = {
  status: GenerationStatus;
  output: string;
  errorMessage: string;
  hasSubmission: boolean;
  generationElapsedMs: number;
  generationDurationMs: number | null;
  formatDuration: (value: number) => string;
  onShowPromptInfo: () => void;
};

export const OutputPanel = ({
  status,
  output,
  errorMessage,
  hasSubmission,
  generationElapsedMs,
  generationDurationMs,
  formatDuration,
  onShowPromptInfo
}: OutputPanelProps) => {
  const renderContent = (): ReactNode => {
    if (status === "idle") {
      return <p>Submit a class purpose to generate class names.</p>;
    }
    if (status === "loading") {
      return (
        <div className="output__status">
          <p>Generating class names...</p>
          <span className="output__timer">
            Thinking for {formatDuration(generationElapsedMs)}
          </span>
        </div>
      );
    }
    if (status === "error") {
      return <p role="alert">{errorMessage}</p>;
    }
    return null;
  };

  return (
    <section aria-live="polite" className="output">
      <div className="output__header">
        <h2>Generated class names</h2>
        {hasSubmission && (
          <button
            type="button"
            className="info-button"
            aria-label="Show last prompt details"
            onClick={onShowPromptInfo}
          >
            ℹ️
          </button>
        )}
      </div>
      {renderContent()}
      {status === "success" && generationDurationMs !== null && (
        <p className="output__timer">
          Generation time: {formatDuration(generationDurationMs)}
        </p>
      )}
      {(status === "loading" || status === "success") && output && (
        <pre>{output}</pre>
      )}
    </section>
  );
};
