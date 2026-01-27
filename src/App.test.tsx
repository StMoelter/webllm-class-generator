import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";

describe("App", () => {
  it("renders the heading and initial state", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /webllm class generator/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/ready for tdd-driven class generation/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/generated classes: 0/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reset/i })
    ).toBeDisabled();
  });

  it("increments and resets the counter", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /generate class/i }));
    expect(screen.getByText(/generated classes: 1/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reset/i })
    ).toBeEnabled();

    await user.click(screen.getByRole("button", { name: /reset/i }));
    expect(screen.getByText(/generated classes: 0/i)).toBeInTheDocument();
  });
});
