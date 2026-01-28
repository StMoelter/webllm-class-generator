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
2. Submit the form to generate ten complicated class names.
3. Review the output in the results panel styled as a modern card layout.

The prompt template lives in `src/prompt.ts`, and supported models are defined in
`src/models.ts`. The app currently loads the Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC
model from Hugging Face at runtime.

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
