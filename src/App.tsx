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
const DEFAULT_TEMPERATURE = 0.9;
export const MAX_OUTPUT_TOKENS = 256;
export const MAX_THINK_TIME_MS = 15000;
const THINK_INTERVAL_MS = 200;

const formatDuration = (milliseconds: number) => {
  const totalSeconds = milliseconds / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}m ${seconds}s`;
};

const isAsyncIterable = (
  value: unknown
): value is AsyncIterable<{ choices: Array<{ delta?: { content?: string } }> }> =>
  typeof value === "object" &&
  value !== null &&
  Symbol.asyncIterator in value;

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
  const [draftPromptTemplate, setDraftPromptTemplate] =
    useState(promptTemplate);
  const [draftTemperature, setDraftTemperature] = useState(temperature);
  const [isPromptInfoOpen, setIsPromptInfoOpen] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<{
    prompt: string;
    temperature: number;
  } | null>(null);
  const [generationElapsedMs, setGenerationElapsedMs] = useState(0);
  const [generationDurationMs, setGenerationDurationMs] = useState<
    number | null
  >(null);
  const engineRef = useRef<WebLlmEngine | null>(null);
  const outputRef = useRef("");
  const generationStartRef = useRef(0);
  const timedOutRef = useRef(false);

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

  useEffect(() => {
    if (!isSettingsOpen) {
      return;
    }

    setDraftPromptTemplate(promptTemplate);
    setDraftTemperature(temperature);
  }, [isSettingsOpen, promptTemplate, temperature]);

  useEffect(() => {
    if (status !== "loading") {
      return;
    }

    const interval = window.setInterval(() => {
      setGenerationElapsedMs(Date.now() - generationStartRef.current);
    }, THINK_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [status]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitDisabled || trimmedPurpose.length === 0) {
      return;
    }

    setStatus("loading");
    setErrorMessage("");
    setOutput(INITIAL_OUTPUT);
    outputRef.current = "";
    const generationStart = Date.now();
    generationStartRef.current = generationStart;
    setGenerationElapsedMs(0);
    setGenerationDurationMs(null);
    timedOutRef.current = false;

    let timeoutId: number | null = null;

    try {
      if (!engineRef.current) {
        throw new Error("Model not ready");
      }

      const prompt = buildPrompt(promptTemplate, trimmedPurpose);
      setLastSubmission({ prompt, temperature });

      timeoutId = window.setTimeout(() => {
        timedOutRef.current = true;
        void engineRef.current?.interruptGenerate?.();
      }, MAX_THINK_TIME_MS);

      const completion = await engineRef.current.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        temperature,
        max_tokens: MAX_OUTPUT_TOKENS,
        stream: true
      });

      if (isAsyncIterable(completion)) {
        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (!delta) {
            continue;
          }
          outputRef.current += delta;
          setOutput(outputRef.current);
        }
      } else {
        const content = completion.choices[0]?.message?.content?.trim() ?? "";
        outputRef.current = content;
        setOutput(content);
      }

      const finalContent = outputRef.current.trim();
      setOutput(finalContent.length > 0 ? finalContent : "No response received.");
      setStatus("success");
      setGenerationDurationMs(Date.now() - generationStart);
    } catch (error) {
      if (timedOutRef.current) {
        const finalContent = outputRef.current.trim();
        setOutput(
          finalContent.length > 0 ? finalContent : "No response received."
        );
        setStatus("success");
        setGenerationDurationMs(Date.now() - generationStart);
      } else {
        setStatus("error");
        setErrorMessage("Unable to generate class names right now.");
      }
    } finally {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      engineRef.current?.resetChat();
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
                value={draftPromptTemplate}
                onChange={(event) => setDraftPromptTemplate(event.target.value)}
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
                  value={draftTemperature}
                  onChange={(event) =>
                    setDraftTemperature(Number(event.target.value))
                  }
                />
                <span>{draftTemperature.toFixed(2)}</span>
              </div>
            </div>
            <div className="settings-panel__actions">
              <button
                type="button"
                className="settings-save"
                onClick={() => {
                  setPromptTemplate(draftPromptTemplate);
                  setTemperature(draftTemperature);
                  setIsSettingsOpen(false);
                }}
              >
                Save settings
              </button>
            </div>
          </div>
        </div>
      )}
      {isPromptInfoOpen && lastSubmission && (
        <div
          className="info-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="prompt-info-title"
          onClick={() => setIsPromptInfoOpen(false)}
        >
          <div
            className="info-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="info-panel__header">
              <h2 id="prompt-info-title">Last prompt details</h2>
              <button
                type="button"
                className="info-close"
                aria-label="Close prompt details"
                onClick={() => setIsPromptInfoOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="info-panel__body">
              <div className="info-panel__meta">
                <span>Temperature</span>
                <strong>{lastSubmission.temperature.toFixed(2)}</strong>
              </div>
              <label className="info-panel__label" htmlFor="prompt-preview">
                Prompt
              </label>
              <pre id="prompt-preview" className="info-panel__prompt">
                {lastSubmission.prompt}
              </pre>
            </div>
          </div>
        </div>
      )}
      <section aria-live="polite" className="output">
        <div className="output__header">
          <h2>Generated class names</h2>
          {lastSubmission && (
            <button
              type="button"
              className="info-button"
              aria-label="Show last prompt details"
              onClick={() => setIsPromptInfoOpen(true)}
            >
              ℹ️
            </button>
          )}
        </div>
        {status === "idle" && (
          <p>Submit a class purpose to generate class names.</p>
        )}
        {status === "loading" && (
          <div className="output__status">
            <p>Generating class names...</p>
            <span className="output__timer">
              Thinking for {formatDuration(generationElapsedMs)}
            </span>
          </div>
        )}
        {status === "success" && generationDurationMs !== null && (
          <p className="output__timer">
            Generation time: {formatDuration(generationDurationMs)}
          </p>
        )}
        {status === "error" && <p role="alert">{errorMessage}</p>}
        {(status === "loading" || status === "success") && output && (
          <pre>{output}</pre>
        )}
      </section>
    </main>
  );
};
