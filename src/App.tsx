import { useRef, useState } from "react";
import { SUPPORTED_MODELS } from "./models";
import { buildPrompt } from "./prompt";
import { createWebLlmEngine, type WebLlmEngine } from "./webllmClient";
import "./App.css";

type GenerationStatus = "idle" | "loading" | "success" | "error";

const INITIAL_OUTPUT = "";
const DEFAULT_STATUS: GenerationStatus = "idle";

export const App = () => {
  const [purpose, setPurpose] = useState("");
  const [output, setOutput] = useState(INITIAL_OUTPUT);
  const [status, setStatus] = useState<GenerationStatus>(DEFAULT_STATUS);
  const [errorMessage, setErrorMessage] = useState("");
  const engineRef = useRef<WebLlmEngine | null>(null);

  const isLoading = status === "loading";
  const trimmedPurpose = purpose.trim();
  const isSubmitDisabled = trimmedPurpose.length === 0 || isLoading;

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
        engineRef.current = await createWebLlmEngine(SUPPORTED_MODELS[0].id);
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
            <input
              id="class-purpose"
              name="class-purpose"
              type="text"
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              placeholder="Describe the class purpose"
              disabled={isLoading}
              className="prompt__input"
            />
            <button
              type="submit"
              aria-label="Submit class purpose"
              disabled={isSubmitDisabled}
              className="prompt__submit"
            >
              <span aria-hidden="true">✨</span>
            </button>
          </div>
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
