import { useEffect, useRef, useState } from "react";
import { OutputPanel } from "./components/OutputPanel";
import { PromptInfoOverlay } from "./components/PromptInfoOverlay";
import { SettingsOverlay } from "./components/SettingsOverlay";
import { SUPPORTED_MODELS } from "./models";
import { buildPrompt, PROMPT_TEMPLATE } from "./prompt";
import { formatDuration } from "./utils/formatDuration";
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
      <SettingsOverlay
        isOpen={isSettingsOpen}
        draftPromptTemplate={draftPromptTemplate}
        draftTemperature={draftTemperature}
        onDraftPromptTemplateChange={setDraftPromptTemplate}
        onDraftTemperatureChange={setDraftTemperature}
        onClose={() => setIsSettingsOpen(false)}
        onSave={() => {
          setPromptTemplate(draftPromptTemplate);
          setTemperature(draftTemperature);
          setIsSettingsOpen(false);
        }}
      />
      <PromptInfoOverlay
        isOpen={isPromptInfoOpen}
        submission={lastSubmission}
        onClose={() => setIsPromptInfoOpen(false)}
      />
      <OutputPanel
        status={status}
        output={output}
        errorMessage={errorMessage}
        hasSubmission={Boolean(lastSubmission)}
        generationElapsedMs={generationElapsedMs}
        generationDurationMs={generationDurationMs}
        formatDuration={formatDuration}
        onShowPromptInfo={() => setIsPromptInfoOpen(true)}
      />
    </main>
  );
};
