# Weight Shift

See when changing a priority changes the leading option. Weight Shift is a browser-local decision sensitivity workbench for analysts, students and workshop facilitators comparing a small set of alternatives.

[Open the application](https://christiansada.github.io/weight-shift/) · [Method and architecture](docs/method.md) · [Demo guide](docs/demo.md)

## Why it exists

A weighted score can conceal a fragile preference. Two options can tie at the baseline and reverse order after a small weight change. Weight Shift makes that trade-off visible with a continuous chart, score comparison and calculated pairwise crossings. It does not choose values or make a decision for you.

## Capabilities

- Edit a title, criterion names, relative weights, option names and preference scores.
- Import a JSON scenario with 2–8 options and 2–6 criteria; import text is capped at 65,536 JavaScript characters.
- Normalize nonnegative weights and calculate additive scores on a 0–100 scale.
- Vary one criterion from 0% to 100%, preserving the proportions of the other weights. If they are all zero, distribute the remainder equally and show that assumption.
- Inspect baseline versus explored scores, tied leaders, open intervals and boundary leaders. Pairwise crossings are calculated algebraically, not estimated from a grid.
- Export the validated input, all score lines, interval/boundary results, tolerance and current exploration as JSON. To reuse an export, copy its `scenario` object into the import field.
- Invalidate results and export as soon as editable input changes. Reset the clearly labelled synthetic example at any time.

## Stack and data flow

TypeScript, Vite, semantic HTML, CSS and SVG; no runtime dependencies. Vitest covers the calculation, Playwright tests the production interface, and axe checks basic accessibility. ESLint, Prettier and strict TypeScript checks run in CI.

`Editor / JSON → validation → normalized baseline → affine score lines → pairwise crossings → intervals and ties → chart / table / JSON export`

All calculation runs in the current browser tab. There is no application server, persistence, analytics or external data API. The hosting provider receives ordinary page requests. Refreshing clears edits. Fonts and assets are local.

## Install and run

Use Node.js 24 and npm. In a downloaded or cloned copy of this repository:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. No environment variables or credentials are required; `.env.example` explains this. Production assets use relative paths so they work under a repository subpath.

## Usage

1. Start with the synthetic community-workshop venue example. Its baseline intentionally ties Library room and Community hall at 80/100.
2. Use preference scores whose 0 and 100 anchors mean something comparable across criteria. Higher must always mean better; affordability is a preference score, not a currency amount. Weights represent the value of a full scale improvement.
3. Edit scores and relative weights, then select **Apply scores & weights**. All weights may not be zero.
4. Choose a criterion, move its explored weight, and inspect the comparison and interval disclosure. Keyboard arrow keys and Home/End also operate the range control.
5. Export the analysis to preserve inputs and full numeric precision. Use **Reset synthetic example** to discard edits.

Use the JSON disclosure to change the number of criteria or options. See [the example file](public/example.json) for the schema. Scores and weights must be JSON numbers. Names must be unique within their group, 1–60 characters, and contain no control characters. Unknown object fields are ignored; standard JSON parsing means a repeated JSON object key uses its last value. Do not use duplicate keys.

## Validation

```sh
npm run check
npx playwright install chromium
npm run test:e2e
npm audit --audit-level=high
```

On Windows browser tests use installed Microsoft Edge; on Linux they use Playwright Chromium. Run `npm run build` before standalone browser tests. `npm run check` runs formatting, lint, strict types, unit tests and production build. `npm run format` applies formatting. Browser tests include actual export parsing, import validation, escaping, stale-result prevention, keyboard interactions, 320/390/768/1440px checks and doubled text. Unit tests include hand-worked ties and an independent direct-sum oracle over 200 deterministic fixtures.

## Deployment

```sh
npm run build
npm run preview
```

Serve `dist/` on any static host. For GitHub Pages, choose **GitHub Actions** as the Pages source and dispatch **Deploy Pages** from `main`. It repeats validation and browser tests before uploading the build. The **Validate** workflow runs for pushes and pull requests with read-only contents permissions. Deployment needs no application secrets.

## Limitations and sources

This is one-way sensitivity of an additive value model. It assumes comparable scores and compensatory, independent preferences. It does not infer weights, normalize raw measurements, test mandatory constraints, model criterion interactions, quantify probability/uncertainty or validate the quality of an actual decision. A leading score is not an objective recommendation. Screen non-negotiable requirements separately.

Crossings use JavaScript floating-point arithmetic. Ties within `1e-8` score points are retained; extremely close crossings and rounded display values may be indistinguishable. Intervals are open and boundaries are separate. A pairwise crossing between nonleaders can split an interval without changing its leader. The current slider uses 0.1 percentage-point increments; the baseline button and exports retain the original normalized weight. Automated accessibility checks do not replace assistive-technology testing.

All supplied scores, venue names and weights are invented examples released under MIT. No external datasets or AI models are used. The [UK multi-criteria analysis manual](https://www.gov.uk/government/publications/multi-criteria-analysis-manual-for-making-government-policy) provides background on additive evaluation and sensitivity; this project is not an official implementation. Interaction research used [Carbon's table guidance](https://carbondesignsystem.com/components/data-table/usage/) and [Observable Plot's interaction concepts](https://observablehq.github.io/plot/features/interactions). No source code, branding or layouts were copied from those sources.

## Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Useful next steps include scenario-file import, explicit score-anchor descriptions, two-weight sensitivity, additional numerical edge-case fixtures, development-toolchain updates and manual screen-reader reviews. Proposals should state assumptions and include independently checked examples.

Licensed under [MIT](LICENSE).
