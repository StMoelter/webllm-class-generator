import { useState } from "react";

const DEFAULT_COUNT = 0;

export const App = () => {
  const [count, setCount] = useState(DEFAULT_COUNT);

  const increment = () => {
    setCount((current) => current + 1);
  };

  const reset = () => {
    setCount(DEFAULT_COUNT);
  };

  const isResetDisabled = count === DEFAULT_COUNT;

  return (
    <main>
      <h1>WebLLM Class Generator</h1>
      <p>Ready for TDD-driven class generation with WebLLM.</p>
      <section aria-label="counter">
        <p>Generated classes: {count}</p>
        <button type="button" onClick={increment}>
          Generate class
        </button>
        <button type="button" onClick={reset} disabled={isResetDisabled}>
          Reset
        </button>
      </section>
    </main>
  );
};
