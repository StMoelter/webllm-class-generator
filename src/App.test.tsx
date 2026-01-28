import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { SUPPORTED_MODELS } from "./models";
import { PROMPT_TEMPLATE } from "./prompt";
import { createWebLlmEngine } from "./webllmClient";

type ChatCompletion = {
  choices: Array<{ message?: { content?: string } }>;
};

type MockEngine = {
  chat: {
    completions: {
      create: ReturnType<typeof vi.fn>;
    };
  };
  resetChat: ReturnType<typeof vi.fn>;
};

vi.mock("./webllmClient", () => ({
  createWebLlmEngine: vi.fn()
}));

describe("App", () => {
  const createCompletion = (content: string): ChatCompletion => ({
    choices: [{ message: { content } }]
  });

  const setupEngine = (result: ChatCompletion | Error) => {
    const engine: MockEngine = {
      chat: {
        completions: {
          create: vi.fn()
        }
      },
      resetChat: vi.fn()
    };

    if (result instanceof Error) {
      engine.chat.completions.create.mockRejectedValue(result);
    } else {
      engine.chat.completions.create.mockResolvedValue(result);
    }

    vi.mocked(createWebLlmEngine).mockResolvedValue(engine);
    return engine;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the input form and initial state", () => {
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
      screen.getByText(/submit a class purpose to generate class names/i)
    ).toBeInTheDocument();
  });

  it("applies the styled layout classes", () => {
    render(<App />);

    expect(document.querySelector("main.page")).toBeTruthy();
    expect(document.querySelector("section.card")).toBeTruthy();
    expect(document.querySelector("section.output")).toBeTruthy();
  });

  it("does not submit when the input is empty", () => {
    render(<App />);

    const form = screen
      .getByLabelText(/what is your class good for/i)
      .closest("form");

    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    expect(createWebLlmEngine).not.toHaveBeenCalled();
  });

  it("submits the prompt to webllm and renders output", async () => {
    const user = userEvent.setup();
    const engine = setupEngine(
      createCompletion("ComplexClassOne\nComplexClassTwo")
    );

    render(<App />);

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
      messages: [{ role: "user", content: expectedPrompt }]
    });

    expect(
      await screen.findByText(/complexclassone/i)
    ).toBeInTheDocument();
    expect(engine.resetChat).toHaveBeenCalledTimes(1);
  });

  it("reuses the engine and surfaces empty responses", async () => {
    const user = userEvent.setup();
    const engine = setupEngine(createCompletion(""));

    render(<App />);

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
    const user = userEvent.setup();
    let resolveEngine: (engine: MockEngine) => void;
    let progressCallback: ((report: {
      progress: number;
      timeElapsed: number;
      text: string;
    }) => void) | null = null;

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

    const input = screen.getByLabelText(/what is your class good for/i);
    await user.type(input, "log routing");
    await user.click(
      screen.getByRole("button", { name: /submit class purpose/i })
    );

    expect(
      screen.getByRole("button", { name: /submit class purpose/i })
    ).toBeDisabled();
    expect(input).toBeEnabled();

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

    expect(
      await screen.findByText(/loadedclass/i)
    ).toBeInTheDocument();
  });

  it("handles missing content in the completion response", async () => {
    const user = userEvent.setup();
    setupEngine({ choices: [{}] });

    render(<App />);

    await user.type(
      screen.getByLabelText(/what is your class good for/i),
      "log aggregation"
    );
    await user.click(
      screen.getByRole("button", { name: /submit class purpose/i })
    );

    expect(
      await screen.findByText(/no response received/i)
    ).toBeInTheDocument();
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

    await user.type(
      screen.getByLabelText(/what is your class good for/i),
      "streaming analytics"
    );
    await user.click(
      screen.getByRole("button", { name: /submit class purpose/i })
    );

    const region = screen.getByRole("heading", {
      name: /generated class names/i
    }).parentElement;
    expect(region).not.toBeNull();
    expect(
      within(region as HTMLElement).getByText(/generating class names/i)
    ).toBeInTheDocument();

    resolveCompletion(createCompletion("StreamyClass"));
    expect(
      await screen.findByText(/streamyclass/i)
    ).toBeInTheDocument();
  });

  it("shows an error message if generation fails", async () => {
    const user = userEvent.setup();
    setupEngine(new Error("Boom"));

    render(<App />);

    await user.type(
      screen.getByLabelText(/what is your class good for/i),
      "event orchestration"
    );
    await user.click(
      screen.getByRole("button", { name: /submit class purpose/i })
    );

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(/unable to generate class names/i);
  });
});
