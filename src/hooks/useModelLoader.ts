import { useEffect, useRef, useState } from "react";
import { SUPPORTED_MODELS } from "../models";
import { createWebLlmEngine, type WebLlmEngine } from "../webllmClient";

type ModelStatus = "idle" | "loading" | "ready" | "error";

type UseModelLoaderResult = {
  engineRef: React.MutableRefObject<WebLlmEngine | null>;
  modelStatus: ModelStatus;
  modelProgress: number;
  modelProgressText: string;
};

export const useModelLoader = (): UseModelLoaderResult => {
  const engineRef = useRef<WebLlmEngine | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus>("idle");
  const [modelProgress, setModelProgress] = useState(0);
  const [modelProgressText, setModelProgressText] = useState("");

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
      }
    };

    loadModel();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    engineRef,
    modelStatus,
    modelProgress,
    modelProgressText
  };
};
