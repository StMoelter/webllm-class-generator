import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App, MAX_OUTPUT_TOKENS, MAX_THINK_TIME_MS } from "./App";
import { SUPPORTED_MODELS } from "./models";
import { PROMPT_TEMPLATE } from "./prompt";
import { createWebLlmEngine } from "./webllmClient";

type ChatCompletion = {
  choices: Array<{ message?: { content?: string } }>;
};

type ChatCompletionChunk = {
  choices: Array<{ delta?: { content?: string } }>;
};

type MockEngine = {
  chat: {
    completions: {
      create: ReturnType<typeof vi.fn>;
    };
  };
  interruptGenerate?: ReturnType<typeof vi.fn>;
  resetChat: ReturnType<typeof vi.fn>;
};

vi.mock("./webllmClient", () => ({
  createWebLlmEngine: vi.fn()
}));

describe("App", () => {
  const createCompletion = (content: string): ChatCompletion => ({
    choices: [{ message: { content } }]
  });

  const createEngine = (): MockEngine => ({
    chat: {
      completions: {
        create: vi.fn()
      }
    },
    interruptGenerate: vi.fn(),
    resetChat: vi.fn()
  });

  const createDeferred = <T,>() => {
    let resolve: (value: T) => void;
    let reject: (error: Error) => void;

    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });

    return {
      promise,
      resolve: resolve!,
      reject: reject!
    };
  };

  const createStream = (chunks: string[]): AsyncIterable<ChatCompletionChunk> =>
    ({
      async *[Symbol.asyncIterator]() {
        for (const chunk of chunks) {
          yield { choices: [{ delta: { content: chunk } }] };
        }
      }
    }) satisfies AsyncIterable<ChatCompletionChunk>;

  const setupEngine = (result: ChatCompletion | Error) => {
    const engine = createEngine();

    if (result instanceof Error) {
      engine.chat.completions.create.mockRejectedValue(result);
    } else {
      engine.chat.completions.create.mockResolvedValue(result);
    }

    vi.mocked(createWebLlmEngine).mockResolvedValue(engine);
    return engine;
  };

  const setupStreamingEngine = (chunks: string[]) => {
    const engine = createEngine();
    engine.chat.completions.create.mockResolvedValue(createStream(chunks));
    vi.mocked(createWebLlmEngine).mockResolvedValue(engine);
    return engine;
  };

  const waitForModelReady = async () => {
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /submit class purpose/i })
      ).toBeEnabled()
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createWebLlmEngine).mockResolvedValue(createEngine());
  });

  it("renders the input form and model loading state on mount", async () => {
    vi.mocked(createWebLlmEngine).mockReturnValue(
      new Promise<MockEngine>(() => undefined)
    );

    render(<App />);

    expect(
      screen.getByRole("heading", { name: /webllm class generator/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/describe what your class does/i)
    ).toBeInTheDocument();
    const input = screen.getByLabelText(/what is your class good for/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("rows", "3");
    expect(
      screen.getByRole("button", { name: /submit class purpose/i })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /open settings/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/submit a class purpose to generate class names/i)
    ).toBeInTheDocument();

    expect(
      await screen.findByRole("progressbar", {
        name: /model loading progress/i
      })
    ).toBeInTheDocument();
  });

  it("applies the styled layout classes", async () => {
    render(<App />);

    await waitForModelReady();

    expect(document.querySelector("main.page")).toBeTruthy();
    expect(document.querySelector("section.card")).toBeTruthy();
    expect(document.querySelector("section.output")).toBeTruthy();
  });

  it("does not submit when the input is empty", async () => {
    const engine = setupEngine(createCompletion("Ignored"));

    render(<App />);
    await waitForModelReady();

    const form = screen
      .getByLabelText(/what is your class good for/i)
      .closest("form");

    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    expect(engine.chat.completions.create).not.toHaveBeenCalled();
  });

  it("submits the prompt to webllm and renders output", async () => {
    const user = userEvent.setup();
    const engine = setupEngine(
      createCompletion("ComplexClassOne\nComplexClassTwo")
    );

    render(<App />);
    await waitForModelReady();

    const input = screen.getByLabelText(/what is your class good for/i);
    await user.type(input, "data ingestion pipelines");
    await user.click(
      screen.getByRole("button", { name: /submit class purpose/i })
    );

    const expectedPrompt = PROMPT_TEMPLATE.replace(
      "{{CLASS_PURPOSE}}",
      "data ingestion pipelines"
    );

    expect(createWebLlmEngine).toHaveBeenCalledWith(
      SUPPORTED_MODELS[0].id,
      expect.any(Function)
    );
    expect(engine.chat.completions.create).toHaveBeenCalledWith({
      messages: [{ role: "user", content: expectedPrompt }],
      temperature: 0.9,
      max_tokens: MAX_OUTPUT_TOKENS,
      stream: true
    });

    expect(await screen.findByText(/complexclassone/i)).toBeInTheDocument();
    expect(engine.resetChat).toHaveBeenCalledTimes(1);
  });

  it("reuses the engine and surfaces empty responses", async () => {
    const user = userEvent.setup();
    const engine = setupEngine(createCompletion(""));

    render(<App />);
    await waitForModelReady();

    const input = screen.getByLabelText(/what is your class good for/i);
    await user.type(input, "batch jobs");
    await user.click(
      screen.getByRole("button", { name: /submit class purpose/i })
    );

    const outputArea = await screen.findByText(/no response received/i);
    expect(outputArea).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, "batch jobs v2");
    await user.click(
      screen.getByRole("button", { name: /submit class purpose/i })
    );

    expect(createWebLlmEngine).toHaveBeenCalledTimes(1);
    expect(engine.chat.completions.create).toHaveBeenCalledTimes(2);
  });

  it("shows model loading progress while initializing", async () => {
    let resolveEngine: (engine: MockEngine) => void;
    let progressCallback:
      | ((report: { progress: number; timeElapsed: number; text: string }) => void)
      | null = null;

    const engine: MockEngine = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue(createCompletion("LoadedClass"))
        }
      },
      resetChat: vi.fn()
    };

    const enginePromise = new Promise<MockEngine>((resolve) => {
      resolveEngine = resolve;
    });

    vi.mocked(createWebLlmEngine).mockImplementation(
      async (_modelId, onProgress) => {
        progressCallback = onProgress ?? null;
        return enginePromise;
      }
    );

    render(<App />);

    const progressBar = await screen.findByRole("progressbar", {
      name: /model loading progress/i
    });
    expect(progressBar).toBeInTheDocument();

    await act(async () => {
      progressCallback?.({
        progress: 0.4,
        timeElapsed: 1,
        text: "Downloading model artifacts"
      });
    });

    expect(progressBar).toHaveAttribute("value", "0.4");
    expect(
      screen.getByText(/downloading model artifacts/i)
    ).toBeInTheDocument();

    await act(async () => {
      resolveEngine(engine);
    });

    await waitForModelReady();
  });

  it("ignores progress updates after unmount", async () => {
    const deferred = createDeferred<MockEngine>();
    let progressCallback:
      | ((report: { progress: number; timeElapsed: number; text: string }) => void)
      | null = null;

    vi.mocked(createWebLlmEngine).mockImplementation(
      async (_modelId, onProgress) => {
        progressCallback = onProgress ?? null;
        return deferred.promise;
      }
    );

    const { unmount } = render(<App />);
    unmount();

    await act(async () => {
      progressCallback?.({ progress: 0.9, timeElapsed: 2, text: "Late update" });
      deferred.resolve(createEngine());
    });
  });

  it("ignores model load failures after unmount", async () => {
    const deferred = createDeferred<MockEngine>();

    vi.mocked(createWebLlmEngine).mockReturnValue(deferred.promise);

    const { unmount } = render(<App />);
    unmount();

    await act(async () => {
      deferred.reject(new Error("late fail"));
    });
  });

  it("handles missing content in the completion response", async () => {
    const user = userEvent.setup();
    setupEngine({ choices: [{}] });

    render(<App />);
    await waitForModelReady();

    await user.type(
      screen.getByLabelText(/what is your class good for/i),
      "log aggregation"
    );
    await user.click(
      screen.getByRole("button", { name: /submit class purpose/i })
    );

    expect(await screen.findByText(/no response received/i)).toBeInTheDocument();
  });

  it("shows a loading state while generating", async () => {
    const user = userEvent.setup();
    let resolveCompletion: (value: ChatCompletion) => void;

    const pendingCompletion = new Promise<ChatCompletion>((resolve) => {
      resolveCompletion = resolve;
    });

    const engine: MockEngine = {
      chat: {
        completions: {
          create: vi.fn().mockReturnValue(pendingCompletion)
        }
      },
      resetChat: vi.fn()
    };
    vi.mocked(createWebLlmEngine).mockResolvedValue(engine);

    render(<App />);
    await waitForModelReady();

    await user.type(
      screen.getByLabelText(/what is your class good for/i),
      "streaming analytics"
    );
    await user.click(
      screen.getByRole("button", { name: /submit class purpose/i })
    );

    const region = screen.getByRole("heading", {
      name: /generated class names/i
    }).closest("section");
    expect(region).not.toBeNull();
    expect(
      within(region as HTMLElement).getByText(/generating class names/i)
    ).toBeInTheDocument();

    resolveCompletion(createCompletion("StreamyClass"));
    expect(await screen.findByText(/streamyclass/i)).toBeInTheDocument();
  });

  it("shows an error message if generation fails", async () => {
    const user = userEvent.setup();
    setupEngine(new Error("Boom"));

    render(<App />);
    await waitForModelReady();

    await user.type(
      screen.getByLabelText(/what is your class good for/i),
      "event orchestration"
    );
    await user.click(
      screen.getByRole("button", { name: /submit class purpose/i })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /unable to generate class names/i
    );
  });

  it("shows model load errors when initialization fails", async () => {
    vi.mocked(createWebLlmEngine).mockRejectedValue(new Error("nope"));

    render(<App />);

    expect(
      await screen.findByText(/unable to load the model\. please refresh/i)
    ).toBeInTheDocument();

    const alerts = await screen.findAllByRole("alert");
    expect(
      alerts.some((alert) =>
        /unable to load the model right now/i.test(alert.textContent ?? "")
      )
    ).toBe(true);
  });

  it("handles missing engines after model load", async () => {
    const user = userEvent.setup();
    vi.mocked(createWebLlmEngine).mockResolvedValue(
      null as unknown as MockEngine
    );

    render(<App />);
    await waitForModelReady();

    await user.type(
      screen.getByLabelText(/what is your class good for/i),
      "audit pipelines"
    );
    await user.click(
      screen.getByRole("button", { name: /submit class purpose/i })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /unable to generate class names/i
    );
  });

  it("lets users edit the prompt template and temperature", async () => {
    const user = userEvent.setup();
    const engine = setupEngine(createCompletion("CustomClass"));

    render(<App />);
    await waitForModelReady();

    await user.click(screen.getByRole("button", { name: /open settings/i }));

    const templateInput = screen.getByLabelText(/prompt template/i);
    fireEvent.change(templateInput, {
      target: { value: "Custom prompt for {{CLASS_PURPOSE}} with extras" }
    });

    const temperatureInput = screen.getByLabelText(/temperature/i);
    fireEvent.change(temperatureInput, { target: { value: "0.3" } });

    await user.click(
      screen.getByRole("button", { name: /save settings/i })
    );

    await user.type(
      screen.getByLabelText(/what is your class good for/i),
      "audit trails"
    );
    await user.click(
      screen.getByRole("button", { name: /submit class purpose/i })
    );

    expect(engine.chat.completions.create).toHaveBeenCalledWith({
      messages: [
        {
          role: "user",
          content: "Custom prompt for audit trails with extras"
        }
      ],
      temperature: 0.3,
      max_tokens: MAX_OUTPUT_TOKENS,
      stream: true
    });
  });

  it("keeps previous settings when the dialog is closed without saving", async () => {
    const user = userEvent.setup();
    const engine = setupEngine(createCompletion("Defaults"));

    render(<App />);
    await waitForModelReady();

    await user.click(screen.getByRole("button", { name: /open settings/i }));

    fireEvent.change(screen.getByLabelText(/prompt template/i), {
      target: { value: "Updated prompt for {{CLASS_PURPOSE}}" }
    });
    fireEvent.change(screen.getByLabelText(/temperature/i), {
      target: { value: "0.2" }
    });

    await user.click(
      screen.getByRole("button", { name: /close settings/i })
    );

    await user.type(
      screen.getByLabelText(/what is your class good for/i),
      "release automation"
    );
    await user.click(
      screen.getByRole("button", { name: /submit class purpose/i })
    );

    expect(engine.chat.completions.create).toHaveBeenCalledWith({
      messages: [
        {
          role: "user",
          content: PROMPT_TEMPLATE.replace(
            "{{CLASS_PURPOSE}}",
            "release automation"
          )
        }
      ],
      temperature: 0.9,
      max_tokens: MAX_OUTPUT_TOKENS,
      stream: true
    });
  });

  it("streams output updates as tokens arrive", async () => {
    const user = userEvent.setup();
    setupStreamingEngine(["FirstLine", "", "\nSecondLine"]);

    render(<App />);
    await waitForModelReady();

    await user.type(
      screen.getByLabelText(/what is your class good for/i),
      "data routing"
    );
    await user.click(
      screen.getByRole("button", { name: /submit class purpose/i })
    );

    expect(await screen.findByText(/firstline/i)).toBeInTheDocument();
    expect(await screen.findByText(/secondline/i)).toBeInTheDocument();
  });

  it("ignores streaming chunks without content", async () => {
    const user = userEvent.setup();
    const engine = createEngine();

    engine.chat.completions.create.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        yield { choices: [] };
        yield { choices: [{ delta: { content: "VisibleClass" } }] };
      }
    });
    vi.mocked(createWebLlmEngine).mockResolvedValue(engine);

    render(<App />);
    await waitForModelReady();

    await user.type(
      screen.getByLabelText(/what is your class good for/i),
      "telemetry"
    );
    await user.click(
      screen.getByRole("button", { name: /submit class purpose/i })
    );

    expect(await screen.findByText(/visibleclass/i)).toBeInTheDocument();
  });

  it("formats long generation times in minutes", async () => {
    const deferred = createDeferred<ChatCompletion>();
    const engine = createEngine();

    engine.chat.completions.create.mockReturnValue(deferred.promise);
    vi.mocked(createWebLlmEngine).mockResolvedValue(engine);

    render(<App />);
    await waitForModelReady();

    fireEvent.change(screen.getByLabelText(/what is your class good for/i), {
      target: { value: "slow analytics" }
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));

    try {
      fireEvent.click(
        screen.getByRole("button", { name: /submit class purpose/i })
      );

      await act(async () => {
        vi.advanceTimersByTime(65000);
      });

      await act(async () => {
        deferred.resolve(createCompletion("SlowClass"));
        await deferred.promise;
      });

      expect(
        screen.getByText(/generation time: 1m 05s/i)
      ).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows prompt details in the info overlay", async () => {
    const user = userEvent.setup();
    setupEngine(createCompletion("InfoClass"));

    render(<App />);
    await waitForModelReady();

    await user.type(
      screen.getByLabelText(/what is your class good for/i),
      "governance workflows"
    );
    await user.click(
      screen.getByRole("button", { name: /submit class purpose/i })
    );

    await screen.findByText(/infoclass/i);

    await user.click(
      screen.getByRole("button", { name: /show last prompt details/i })
    );

    expect(
      screen.getByRole("heading", { name: /last prompt details/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/generate ten intentionally overcomplicated class names/i)
    ).toBeInTheDocument();
    expect(screen.getByText("0.90")).toBeInTheDocument();

    await user.click(
      screen.getByRole("heading", { name: /last prompt details/i })
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /close prompt details/i })
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /show last prompt details/i })
    );

    fireEvent.click(screen.getByRole("dialog"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("interrupts generation after the maximum think time without erroring", async () => {
    const deferred = createDeferred<void>();
    const engine = createEngine();

    engine.chat.completions.create.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        yield { choices: [] };
        await deferred.promise;
      }
    });
    engine.interruptGenerate?.mockImplementation(async () => {
      deferred.resolve();
    });

    vi.mocked(createWebLlmEngine).mockResolvedValue(engine);

    render(<App />);
    await waitForModelReady();

    fireEvent.change(screen.getByLabelText(/what is your class good for/i), {
      target: { value: "fraud detection" }
    });

    vi.useFakeTimers();
    try {
      fireEvent.click(
        screen.getByRole("button", { name: /submit class purpose/i })
      );

      expect(screen.getByText(/thinking for/i)).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(MAX_THINK_TIME_MS);
      });

      expect(engine.interruptGenerate).toHaveBeenCalledTimes(1);
      await act(async () => {
        await deferred.promise;
      });

      expect(screen.getByText(/no response received/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps partial results when the request fails after a timeout", async () => {
    const deferred = createDeferred<ChatCompletion>();
    const engine = createEngine();

    engine.chat.completions.create.mockReturnValue(deferred.promise);
    vi.mocked(createWebLlmEngine).mockResolvedValue(engine);

    render(<App />);
    await waitForModelReady();

    fireEvent.change(screen.getByLabelText(/what is your class good for/i), {
      target: { value: "risk modeling" }
    });

    vi.useFakeTimers();
    try {
      fireEvent.click(
        screen.getByRole("button", { name: /submit class purpose/i })
      );

      await act(async () => {
        vi.advanceTimersByTime(MAX_THINK_TIME_MS);
      });

      await act(async () => {
        deferred.reject(new Error("late failure"));
        await deferred.promise.catch(() => undefined);
      });

      expect(screen.getByText(/no response received/i)).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("preserves streamed output when a timeout occurs mid-stream", async () => {
    const engine = createEngine();

    engine.chat.completions.create.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        yield { choices: [{ delta: { content: "PartialResult" } }] };
        await new Promise((resolve) => setTimeout(resolve, 1));
        throw new Error("stream fail");
      }
    });
    vi.mocked(createWebLlmEngine).mockResolvedValue(engine);

    render(<App />);
    await waitForModelReady();

    fireEvent.change(screen.getByLabelText(/what is your class good for/i), {
      target: { value: "forecasting" }
    });

    vi.useFakeTimers();
    try {
      fireEvent.click(
        screen.getByRole("button", { name: /submit class purpose/i })
      );

      await act(async () => {
        vi.advanceTimersByTime(MAX_THINK_TIME_MS);
      });
      await act(async () => {
        vi.advanceTimersByTime(1);
      });

      expect(screen.getByText(/partialresult/i)).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the settings panel open when clicking inside and closes on backdrop", async () => {
    const user = userEvent.setup();

    render(<App />);
    await waitForModelReady();

    await user.click(screen.getByRole("button", { name: /open settings/i }));

    const dialog = screen.getByRole("dialog");
    const panelTitle = screen.getByRole("heading", { name: /settings/i });

    await user.click(panelTitle);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(dialog);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
