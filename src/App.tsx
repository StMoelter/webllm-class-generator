import { useRef, useState } from "react";
import { SUPPORTED_MODELS } from "./models";
import { buildPrompt } from "./prompt";
import { createWebLlmEngine, type WebLlmEngine } from "./webllmClient";
import "./App.css";

type GenerationStatus = "idle" | "loading" | "success" | "error";
type ModelStatus = "idle" | "loading" | "ready" | "error";

const INITIAL_OUTPUT = "";
const DEFAULT_STATUS: GenerationStatus = "idle";
const DEFAULT_MODEL_STATUS: ModelStatus = "idle";

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
  const engineRef = useRef<WebLlmEngine | null>(null);

  const isLoading = status === "loading";
  const isModelLoading = modelStatus === "loading";
  const trimmedPurpose = purpose.trim();
  const isSubmitDisabled =
    trimmedPurpose.length === 0 || isLoading || isModelLoading;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitDisabled) {
      return;
    }

    setStatus("loading");
    setErrorMessage("");
    setOutput(INITIAL_OUTPUT);

    try {
      if (!engineRef.current) {
        setModelStatus("loading");
        setModelProgress(0);
        setModelProgressText("Preparing model download...");
        engineRef.current = await createWebLlmEngine(
          SUPPORTED_MODELS[0].id,
          (report) => {
            setModelProgress(report.progress);
            setModelProgressText(report.text);
          }
        );
        setModelStatus("ready");
      }

      const prompt = buildPrompt(trimmedPurpose);
      const completion = await engineRef.current.chat.completions.create({
        messages: [{ role: "user", content: prompt }]
      });
      const content = completion.choices[0]?.message?.content?.trim() ?? "";

      setOutput(content.length > 0 ? content : "No response received.");
      setStatus("success");
      engineRef.current.resetChat();
    } catch (error) {
      setStatus("error");
      setModelStatus("error");
      setErrorMessage("Unable to generate class names right now.");
    }
  };

  return (
    <main className="page">
      <section className="card">
        <header className="card__header">
          <p className="eyebrow">WebLLM-powered naming</p>
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
        </form>
      </section>
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
