import { useEffect, useState } from "react";
import { OutputPanel } from "./components/OutputPanel";
import { PromptCard } from "./components/PromptCard";
import { PromptInfoOverlay } from "./components/PromptInfoOverlay";
import { SettingsOverlay } from "./components/SettingsOverlay";
import { PROMPT_TEMPLATE } from "./prompt";
import { useGeneration } from "./hooks/useGeneration";
import { useModelLoader } from "./hooks/useModelLoader";
import { formatDuration } from "./utils/formatDuration";
import "./App.css";

const DEFAULT_TEMPERATURE = 0.9;
export const MAX_OUTPUT_TOKENS = 256;
export const MAX_THINK_TIME_MS = 15000;

export const App = () => {
  const [purpose, setPurpose] = useState("");
  const [promptTemplate, setPromptTemplate] = useState(PROMPT_TEMPLATE);
  const [temperature, setTemperature] = useState(DEFAULT_TEMPERATURE);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draftPromptTemplate, setDraftPromptTemplate] =
    useState(promptTemplate);
  const [draftTemperature, setDraftTemperature] = useState(temperature);
  const [isPromptInfoOpen, setIsPromptInfoOpen] = useState(false);
  const { engineRef, modelStatus, modelProgress, modelProgressText } =
    useModelLoader();

  const {
    status,
    output,
    errorMessage,
    lastSubmission,
    generationElapsedMs,
    generationDurationMs,
    handleSubmit,
    handleModelError
  } = useGeneration({
    engineRef,
    promptTemplate,
    temperature,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    maxThinkTimeMs: MAX_THINK_TIME_MS
  });

  const isLoading = status === "loading";
  const isModelLoading = modelStatus === "loading";
  const isSubmitDisabled =
    isLoading || isModelLoading || modelStatus !== "ready";

  useEffect(() => {
    if (!isSettingsOpen) {
      return;
    }

    setDraftPromptTemplate(promptTemplate);
    setDraftTemperature(temperature);
  }, [isSettingsOpen, promptTemplate, temperature]);

  useEffect(() => {
    if (modelStatus === "error") {
      handleModelError();
    }
  }, [handleModelError, modelStatus]);


  return (
    <main className="page">
      <PromptCard
        purpose={purpose}
        isSubmitDisabled={isSubmitDisabled}
        isModelLoading={isModelLoading}
        modelProgress={modelProgress}
        modelProgressText={modelProgressText}
        modelStatus={modelStatus}
        onPurposeChange={setPurpose}
        onSubmit={(event) => handleSubmit(event, purpose, isSubmitDisabled)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
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
