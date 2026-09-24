# Method and architecture

## Calculation

Let option i have preference score s[i,j] on criterion j. Weights w[j] are normalized by their positive total. Baseline score = sum(s[i,j] * w[j] / sum(w)). A weight values the swing from 0 to 100 on that criterion; simply assigning importance without considering score anchors can mislead.

When criterion k has explored weight t in [0,1], every other criterion receives (1-t) * w[j] / sum(w excluding k). If that denominator is zero, use (1-t)/(criterion count - 1) and display an explicit notice.

For each option, b[i] is its score at t=0 and a[i] is its score at t=1 minus b[i]. Its score is b[i]+a[i]*t. For each nonparallel pair, solve t=(b[j]-b[i])/(a[i]-a[j]). Retain distinct internal floating-point crossings and endpoints 0 and 1; sort them. Evaluate each open interval at its midpoint, and every boundary separately. Permanent ties are preserved. This partitions all pairwise order changes in exact arithmetic; implementation uses finite-precision JavaScript numbers and an absolute leader tolerance of 1e-8 score units. It is not certified exact arithmetic.

Lower-ranked options crossing can create adjacent intervals with the same leaders. The interface intentionally exposes these rather than discarding evidence. Percentages and scores are displayed to two decimals; report values are not rounded. The range control moves in 0.1 percentage-point steps, while Return to baseline restores the full normalized share.

## Source boundaries

- `src/model.ts`: types, synthetic example, validation, normalized scoring, affine lines, crossings and interval analysis. Functions have no browser side effects. `analyze` validates its inputs; smaller calculation helpers expect an already validated scenario.
- `src/main.ts`: input/edit state, invalidation, rendering and temporary Blob export. All imported labels are escaped before HTML interpolation. Input sizes and numeric bounds limit workload. JSON follows standard last-key-wins semantics; duplicate object keys are not specially detected.
- `src/style.css`: responsive interface, visible focus, chart legend and scrollable data tables.
- `tests/model.test.ts`: hand-derived examples, validation boundaries and 200 deterministic fixtures checked against independent direct weighted sums at three interior positions in every interval.
- `tests/browser/app.spec.ts`: real production interaction and downloaded JSON, accessibility and layout checks.

No network calls, local storage, cookies or third-party script requests originate from the application. Browser downloads contain only the current scenario and computed results. Imported scenario content is never stored by the application.

## Interpretation limits

The tool explains a specified scoring model, not reality. It does not assess whether scores are truthful, criteria duplicate each other, anchors are comparable, preferences are independent or a compensatory approach is suitable. Only one weight changes at a time; fixing score values does not assess score uncertainty. Use constraints separately. Leading status is not a probability or recommendation.
