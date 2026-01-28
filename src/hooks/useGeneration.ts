import { useCallback, useEffect, useRef, useState } from "react";
import { buildPrompt } from "../prompt";
import type { WebLlmEngine } from "../webllmClient";

type GenerationStatus = "idle" | "loading" | "success" | "error";

type Submission = {
  prompt: string;
  temperature: number;
};

type UseGenerationParams = {
  engineRef: React.MutableRefObject<WebLlmEngine | null>;
  promptTemplate: string;
  temperature: number;
  maxOutputTokens: number;
  maxThinkTimeMs: number;
};

type UseGenerationResult = {
  status: GenerationStatus;
  output: string;
  errorMessage: string;
  lastSubmission: Submission | null;
  generationElapsedMs: number;
  generationDurationMs: number | null;
  handleSubmit: (
    event: React.FormEvent<HTMLFormElement>,
    purpose: string,
    isSubmitDisabled: boolean
  ) => Promise<void>;
  handleModelError: () => void;
};

const INITIAL_OUTPUT = "";
const THINK_INTERVAL_MS = 200;

const isAsyncIterable = (
  value: unknown
): value is AsyncIterable<{ choices: Array<{ delta?: { content?: string } }> }> =>
  typeof value === "object" &&
  value !== null &&
  Symbol.asyncIterator in value;

export const useGeneration = ({
  engineRef,
  promptTemplate,
  temperature,
  maxOutputTokens,
  maxThinkTimeMs
}: UseGenerationParams): UseGenerationResult => {
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [output, setOutput] = useState(INITIAL_OUTPUT);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastSubmission, setLastSubmission] = useState<Submission | null>(null);
  const [generationElapsedMs, setGenerationElapsedMs] = useState(0);
  const [generationDurationMs, setGenerationDurationMs] = useState<
    number | null
  >(null);
  const outputRef = useRef("");
  const generationStartRef = useRef(0);
  const timedOutRef = useRef(false);

  useEffect(() => {
    if (status !== "loading") {
      return;
    }

    const interval = window.setInterval(() => {
      setGenerationElapsedMs(Date.now() - generationStartRef.current);
    }, THINK_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [status]);

  const handleModelError = useCallback(() => {
    setStatus("error");
    setErrorMessage("Unable to load the model right now.");
  }, []);

  const handleSubmit = useCallback(
    async (
      event: React.FormEvent<HTMLFormElement>,
      purpose: string,
      isSubmitDisabled: boolean
    ) => {
      event.preventDefault();

      const trimmedPurpose = purpose.trim();
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
        }, maxThinkTimeMs);

        const completion = await engineRef.current.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          temperature,
          max_tokens: maxOutputTokens,
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
        setOutput(
          finalContent.length > 0 ? finalContent : "No response received."
        );
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
    },
    [engineRef, maxOutputTokens, maxThinkTimeMs, promptTemplate, temperature]
  );

  return {
    status,
    output,
    errorMessage,
    lastSubmission,
    generationElapsedMs,
    generationDurationMs,
    handleSubmit,
    handleModelError
  };
};
