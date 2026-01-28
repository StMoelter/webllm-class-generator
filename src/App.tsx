import { useEffect, useRef, useState } from "react";
import { SUPPORTED_MODELS } from "./models";
import { buildPrompt, PROMPT_TEMPLATE } from "./prompt";
import { createWebLlmEngine, type WebLlmEngine } from "./webllmClient";
import "./App.css";

type GenerationStatus = "idle" | "loading" | "success" | "error";
type ModelStatus = "idle" | "loading" | "ready" | "error";

const INITIAL_OUTPUT = "";
const DEFAULT_STATUS: GenerationStatus = "idle";
const DEFAULT_MODEL_STATUS: ModelStatus = "idle";
const DEFAULT_TEMPERATURE = 0.7;

export const App = () => {
  const [purpose, setPurpose] = useState("");
  const [output, setOutput] = useState(INITIAL_OUTPUT);
  const [status, setStatus] = useState<GenerationStatus>(DEFAULT_STATUS);
  const [errorMessage, setErrorMessage] = useState("");
  const [modelStatus, setModelStatus] = useState<ModelStatus>(
    DEFAULT_MODEL_STATUS
  );
  const [modelProgress, setModelProgress] = useState(0);
  const [modelProgressText, setModelProgressText] = useState("");
  const [promptTemplate, setPromptTemplate] = useState(PROMPT_TEMPLATE);
  const [temperature, setTemperature] = useState(DEFAULT_TEMPERATURE);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const engineRef = useRef<WebLlmEngine | null>(null);

  const isLoading = status === "loading";
  const isModelLoading = modelStatus === "loading";
  const trimmedPurpose = purpose.trim();
  const isSubmitDisabled =
    isLoading || isModelLoading || modelStatus !== "ready";

  useEffect(() => {
    let isMounted = true;

    const loadModel = async () => {
      setModelStatus("loading");
      setModelProgress(0);
      setModelProgressText("Preparing model download...");
      try {
        const engine = await createWebLlmEngine(
          SUPPORTED_MODELS[0].id,
          (report) => {
            if (!isMounted) {
              return;
            }
            setModelProgress(report.progress);
            setModelProgressText(report.text);
          }
        );

        if (!isMounted) {
          return;
        }

        engineRef.current = engine;
        setModelStatus("ready");
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setModelStatus("error");
        setStatus("error");
        setErrorMessage("Unable to load the model right now.");
      }
    };

    loadModel();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitDisabled || trimmedPurpose.length === 0) {
      return;
    }

    setStatus("loading");
    setErrorMessage("");
    setOutput(INITIAL_OUTPUT);

    try {
      if (!engineRef.current) {
        throw new Error("Model not ready");
      }

      const prompt = buildPrompt(promptTemplate, trimmedPurpose);
      const completion = await engineRef.current.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        temperature
      });
      const content = completion.choices[0]?.message?.content?.trim() ?? "";

      setOutput(content.length > 0 ? content : "No response received.");
      setStatus("success");
      engineRef.current.resetChat();
    } catch (error) {
      setStatus("error");
      setErrorMessage("Unable to generate class names right now.");
    }
  };

  return (
    <main className="page">
      <section className="card">
        <header className="card__header">
          <div className="card__header-top">
            <p className="eyebrow">WebLLM-powered naming</p>
            <button
              type="button"
              className="settings-button"
              aria-label="Open settings"
              onClick={() => setIsSettingsOpen(true)}
            >
              <span aria-hidden="true">⚙️</span>
            </button>
          </div>
          <h1>WebLLM Class Generator</h1>
          <p className="subtitle">
            Describe what your class does and get ten intricate class names.
          </p>
        </header>
        <form onSubmit={handleSubmit} className="prompt">
          <label htmlFor="class-purpose">What is your class good for?</label>
          <div className="prompt__field">
            <textarea
              id="class-purpose"
              name="class-purpose"
              rows={3}
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
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
      {isSettingsOpen && (
        <div
          className="settings-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            className="settings-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="settings-panel__header">
              <h2 id="settings-title">Settings</h2>
              <button
                type="button"
                className="settings-close"
                aria-label="Close settings"
                onClick={() => setIsSettingsOpen(false)}
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
                value={promptTemplate}
                onChange={(event) => setPromptTemplate(event.target.value)}
              />
              <p className="settings-panel__hint">
                Use {"{{CLASS_PURPOSE}}"} as the placeholder for the class
                description.
              </p>
              <label htmlFor="temperature">Temperature</label>
              <div className="settings-panel__slider">
                <input
                  id="temperature"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={temperature}
                  onChange={(event) =>
                    setTemperature(Number(event.target.value))
                  }
                />
                <span>{temperature.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <section aria-live="polite" className="output">
        <h2>Generated class names</h2>
        {status === "idle" && (
          <p>Submit a class purpose to generate class names.</p>
        )}
        {status === "loading" && <p>Generating class names...</p>}
        {status === "error" && <p role="alert">{errorMessage}</p>}
        {status === "success" && <pre>{output}</pre>}
      </section>
    </main>
  );
};
