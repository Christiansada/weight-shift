import './style.css';
import {
  analyze,
  leaders,
  normalizedWeights,
  parseScenario,
  sample,
  scoresAt,
  validate,
  variedWeights,
  type Analysis,
  type Scenario,
} from './model';

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const escape = (v: string) =>
  v.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
const colors = [
  '#17604c',
  '#7849a6',
  '#b04a24',
  '#2468a2',
  '#875a06',
  '#ad2864',
  '#366515',
  '#56596a',
];
let scenario: Scenario = structuredClone(sample);
let analysis: Analysis;
let share = 0.4;
let imported = false;
let valid = false;
const fmt = (v: number) => v.toFixed(2);
const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
function showError(error: unknown) {
  $('error').textContent =
    error instanceof Error ? error.message : 'Unable to analyze this scenario.';
  $('error').hidden = false;
}
function invalidate() {
  valid = false;
  $('results').hidden = true;
  $<HTMLButtonElement>('export').disabled = true;
  $('error').hidden = true;
  $('status').textContent =
    'Inputs changed. Apply scores & weights to refresh the analysis.';
}
function renderEditor() {
  $<HTMLInputElement>('title').value = scenario.title;
  $('criteria').innerHTML = scenario.criteria
    .map(
      (c, i) =>
        `<fieldset><legend>Criterion ${i + 1}</legend><label>Name<input id="c-name-${i}" value="${escape(c.name)}" maxlength="60" required /></label><label>Relative weight<input id="c-weight-${i}" type="number" min="0" max="1000" step="any" value="${c.weight}" required /></label></fieldset>`,
    )
    .join('');
  $('matrix-head').innerHTML =
    `<tr><th scope="col">Option name</th>${scenario.criteria.map((c) => `<th scope="col">${escape(c.name)}</th>`).join('')}</tr>`;
  $('matrix-body').innerHTML = scenario.options
    .map(
      (o, i) =>
        `<tr><th scope="row"><input id="o-name-${i}" aria-label="Option ${i + 1} name" maxlength="60" value="${escape(o.name)}" required /></th>${o.scores.map((s, j) => `<td><input id="score-${i}-${j}" aria-label="${escape(o.name)}: ${escape(scenario.criteria[j].name)} score" type="number" min="0" max="100" step="any" value="${s}" required /></td>`).join('')}</tr>`,
    )
    .join('');
  $<HTMLTextAreaElement>('json-input').value = JSON.stringify(
    scenario,
    null,
    2,
  );
  $('data-note').textContent = imported
    ? 'User-edited scenario. Scores and sources are your responsibility.'
    : 'Illustrative venue scores. No real venue data.';
}
function readEditor(): Scenario {
  const numeric = (id: string) =>
    $<HTMLInputElement>(id).value.trim() === ''
      ? NaN
      : $<HTMLInputElement>(id).valueAsNumber;
  return validate({
    title: $<HTMLInputElement>('title').value,
    criteria: scenario.criteria.map((_, i) => ({
      name: $<HTMLInputElement>(`c-name-${i}`).value,
      weight: numeric(`c-weight-${i}`),
    })),
    options: scenario.options.map((_, i) => ({
      name: $<HTMLInputElement>(`o-name-${i}`).value,
      scores: scenario.criteria.map((_, j) => numeric(`score-${i}-${j}`)),
    })),
  });
}
function prepare(criterion = 0) {
  analysis = analyze(scenario, criterion);
  share = analysis.weights[criterion];
  $<HTMLSelectElement>('criterion').innerHTML = scenario.criteria
    .map((c, i) => `<option value="${i}">${escape(c.name)}</option>`)
    .join('');
  $<HTMLSelectElement>('criterion').value = String(criterion);
  $<HTMLInputElement>('share').value = String(share * 100);
  $('decision-name').textContent = scenario.title;
  $('error').hidden = true;
  $('results').hidden = false;
  valid = true;
  $<HTMLButtonElement>('export').disabled = false;
  $('status').textContent =
    `Analysis ready: ${scenario.options.length} options and ${scenario.criteria.length} criteria. Explore a weight below.`;
  renderResults();
}
function renderResults() {
  const weights = variedWeights(scenario, analysis.criterion, share);
  const scores = scoresAt(scenario, weights);
  const leading = leaders(scores);
  $('share-value').textContent = pct(share);
  $('winner').textContent = leading
    .map((i) => scenario.options[i].name)
    .join(' + ');
  $('winner-score').textContent =
    `${fmt(Math.max(...scores))} / 100${leading.length > 1 ? ' · Tied leaders' : ''}`;
  $('remainder').textContent = analysis.equalRemainder
    ? 'All other baseline weights are zero. The remaining share is split equally between them during exploration.'
    : 'The remaining share is distributed in proportion to the other baseline weights.';
  $('weight-summary').textContent =
    `${scenario.criteria[analysis.criterion].name}: ${pct(share)}`;
  $('ranking').innerHTML = scores
    .map((score, i) => ({ score, i }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map(
      ({ score, i }) =>
        `<tr><th scope="row"><span class="swatch" style="background:${colors[i]}"></span>${escape(scenario.options[i].name)}${leading.includes(i) ? '<span class="leader-label">Leading</span>' : ''}</th><td>${fmt(analysis.baseline[i])}</td><td><strong>${fmt(score)}</strong></td><td>${score - analysis.baseline[i] > 0 ? '+' : ''}${fmt(score - analysis.baseline[i])}</td></tr>`,
    )
    .join('');
  const names = (indexes: number[]) =>
    indexes.map((i) => escape(scenario.options[i].name)).join(' + ');
  $('intervals').innerHTML = analysis.intervals
    .map(
      (v) =>
        `<li><span>${pct(v.from)} &lt; weight &lt; ${pct(v.to)}</span><strong>${names(v.leaders)}</strong></li>`,
    )
    .join('');
  $('boundaries').innerHTML = analysis.boundaries
    .map(
      (v) =>
        `<li><span>At ${pct(v.share)}</span><strong>${names(v.leaders)}</strong></li>`,
    )
    .join('');
  $('legend').innerHTML = scenario.options
    .map(
      (o, i) =>
        `<span><span class="swatch" style="background:${colors[i]}"></span>${escape(o.name)}</span>`,
    )
    .join('');
  const x = (v: number) => 45 + v * 570;
  const y = (v: number) => 270 - v * 2.3;
  $('chart').innerHTML =
    `<svg viewBox="0 0 650 320" role="img" aria-labelledby="chart-title chart-desc"><title id="chart-title">Sensitivity to ${escape(scenario.criteria[analysis.criterion].name)} weight</title><desc id="chart-desc">Weighted option scores across weights from zero to one hundred percent. Use the comparison table and interval disclosure for values.</desc>${[0, 25, 50, 75, 100].map((v) => `<line x1="45" x2="615" y1="${y(v)}" y2="${y(v)}" stroke="#d9dfd6"/><text x="33" y="${y(v) + 4}" text-anchor="end">${v}</text><text x="${x(v / 100)}" y="296" text-anchor="middle">${v}%</text>`).join('')}${analysis.lines.map((l, i) => `<path d="M${x(0)},${y(l.intercept)} L${x(1)},${y(l.intercept + l.slope)}" fill="none" stroke="${colors[i]}" stroke-width="3" stroke-dasharray="${i > 3 ? '7 4' : 'none'}"/>`).join('')}<line x1="${x(share)}" x2="${x(share)}" y1="30" y2="275" stroke="#293831" stroke-dasharray="4 5"/>${scores.map((v, i) => `<circle cx="${x(share)}" cy="${y(v)}" r="5" fill="${colors[i]}" stroke="white" stroke-width="2"/>`).join('')}<text x="330" y="317" text-anchor="middle">Explored criterion weight</text></svg>`;
}
$('scenario-form').addEventListener('input', () => {
  imported = true;
  invalidate();
});
$('scenario-form').addEventListener('submit', (event) => {
  event.preventDefault();
  invalidate();
  try {
    scenario = readEditor();
    renderEditor();
    prepare();
  } catch (error) {
    showError(error);
  }
});
$('json-input').addEventListener('input', invalidate);
$('import').addEventListener('click', () => {
  invalidate();
  try {
    scenario = parseScenario($<HTMLTextAreaElement>('json-input').value);
    imported = true;
    renderEditor();
    prepare();
  } catch (error) {
    showError(error);
  }
});
$('reset').addEventListener('click', () => {
  scenario = structuredClone(sample);
  imported = false;
  renderEditor();
  prepare();
});
$('criterion').addEventListener('change', () => {
  if (valid) prepare(Number($<HTMLSelectElement>('criterion').value));
});
$('share').addEventListener('input', () => {
  if (!valid) return;
  share = Number($<HTMLInputElement>('share').value) / 100;
  renderResults();
});
$('baseline').addEventListener('click', () => {
  if (!valid) return;
  share = normalizedWeights(scenario)[analysis.criterion];
  $<HTMLInputElement>('share').value = String(share * 100);
  renderResults();
});
$('export').addEventListener('click', () => {
  if (!valid) return;
  const weights = variedWeights(scenario, analysis.criterion, share);
  const report = {
    format: 'weight-shift-analysis-v1',
    dataSource: imported
      ? 'User-edited; provenance not verified'
      : 'Synthetic illustrative venue preferences',
    method:
      'Additive scores; one varied weight; proportional remainder, or equal remainder if all others are zero',
    tolerance: 1e-8,
    ...analysis,
    explored: {
      share,
      weights,
      scores: scoresAt(scenario, weights),
      leaders: leaders(scoresAt(scenario, weights)),
    },
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'weight-shift-analysis.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
renderEditor();
prepare();
