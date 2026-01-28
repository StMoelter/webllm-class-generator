# WebLLM Class Generator

A React-based tool that generates advanced class names using WebLLM.

## Requirements
- Node.js 20+
- npm 9+

## Getting started
```bash
npm install
npm run dev
```

## Usage
1. Enter what your class is good for (in English).
2. Use the settings gear to adjust the prompt template and temperature if needed.
3. Submit the form to generate ten intentionally overcomplicated class names.
4. Watch the model loading progress bar while the model downloads on page load.
5. Review the output in the results panel styled as a modern card layout.

The prompt template lives in `src/prompt.ts`, and supported models are defined in
`src/models.ts`. The app currently loads the Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC
model from Hugging Face at runtime.

## Locked product requirements (do not modify without explicit approval)
- The model begins downloading immediately when the page loads, with a visible progress bar.
- The submit button remains disabled until the model has finished loading.
- The loading progress bar reflects model download progress on page load, not after submit.
- Users can edit the prompt template and temperature via the settings overlay.

These requirements are fixed for this project and should not be altered by coding agents or refactors.

## Scripts
- `npm run dev` - start the development server.
- `npm run build` - build the production bundle.
- `npm run build:single` - build a standalone `index.html` with inlined assets.
- `npm run preview` - preview the production build.
- `npm run lint` - run ESLint.
- `npm run lint:report` - generate ESLint JSON report in `reports/`.
- `npm run test` - run tests once.
- `npm run coverage` - run tests with 100% coverage thresholds and reports.

## Quality gates
- Coverage thresholds are enforced at 100% for lines, branches, statements, and functions.
- Linting is enforced with zero warnings.

## CI/CD
- Every push and pull request runs linting and coverage checks.
- Quality reports (coverage and ESLint JSON) are stored as workflow artifacts.
- Tagging a release (e.g. `v1.0.0`) triggers a deployment build that produces a
  single `index.html` artifact (`dist-singlefile/index.html`) ready for standalone use.
