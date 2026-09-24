export interface Scenario {
  title: string;
  criteria: { name: string; weight: number }[];
  options: { name: string; scores: number[] }[];
}
export const TOLERANCE = 1e-8;
export const sample: Scenario = {
  title: 'A venue for a community workshop',
  criteria: [
    { name: 'Accessibility', weight: 40 },
    { name: 'Facilities', weight: 35 },
    { name: 'Affordability', weight: 25 },
  ],
  options: [
    { name: 'Library room', scores: [90, 65, 85] },
    { name: 'Studio space', scores: [60, 95, 55] },
    { name: 'Community hall', scores: [75, 75, 95] },
    { name: 'Garden pavilion', scores: [50, 55, 90] },
  ],
};
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected a scenario object.');
  return value as Record<string, unknown>;
}
function name(value: unknown, label: string): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > 60 ||
    [...value].some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    )
  )
    throw new Error(
      `${label} must be 1–60 characters without control characters.`,
    );
  return value.trim();
}
function number(value: unknown, max: number, label: string): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > max
  )
    throw new Error(`${label} must be a finite number between 0 and ${max}.`);
  return value;
}
export function validate(value: unknown): Scenario {
  const s = record(value);
  if (
    !Array.isArray(s.criteria) ||
    s.criteria.length < 2 ||
    s.criteria.length > 6
  )
    throw new Error('Use 2–6 criteria.');
  if (!Array.isArray(s.options) || s.options.length < 2 || s.options.length > 8)
    throw new Error('Use 2–8 options.');
  const criteria = s.criteria.map((v) => {
    const c = record(v);
    return {
      name: name(c.name, 'Criterion name'),
      weight: number(c.weight, 1000, 'Weight'),
    };
  });
  if (!criteria.some((c) => c.weight > 0))
    throw new Error('At least one weight must be positive.');
  const options = s.options.map((v) => {
    const o = record(v);
    if (!Array.isArray(o.scores) || o.scores.length !== criteria.length)
      throw new Error('Each option needs one score per criterion.');
    return {
      name: name(o.name, 'Option name'),
      scores: o.scores.map((v) => number(v, 100, 'Score')),
    };
  });
  for (const list of [criteria, options])
    if (new Set(list.map((v) => v.name.toLowerCase())).size !== list.length)
      throw new Error('Names within each group must be unique.');
  return { title: name(s.title, 'Title'), criteria, options };
}
export function parseScenario(text: string): Scenario {
  if (text.length > 65536)
    throw new Error('Scenario must be at most 64 KiB of text.');
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('Enter valid JSON.');
  }
  return validate(value);
}
export function normalizedWeights(s: Scenario): number[] {
  const total = s.criteria.reduce((sum, c) => sum + c.weight, 0);
  return s.criteria.map((c) => c.weight / total);
}
export function scoresAt(s: Scenario, weights: number[]): number[] {
  return s.options.map((o) =>
    o.scores.reduce((sum, score, i) => sum + score * weights[i], 0),
  );
}
export function leaders(scores: number[]): number[] {
  const best = Math.max(...scores);
  return scores.flatMap((score, i) => (best - score <= TOLERANCE ? [i] : []));
}
export function variedWeights(
  s: Scenario,
  criterion: number,
  share: number,
): number[] {
  if (
    !Number.isInteger(criterion) ||
    criterion < 0 ||
    criterion >= s.criteria.length
  )
    throw new Error('Choose an existing criterion.');
  number(share, 1, 'Share');
  const rest = s.criteria.reduce(
    (sum, c, i) => sum + (i === criterion ? 0 : c.weight),
    0,
  );
  return s.criteria.map((c, i) =>
    i === criterion
      ? share
      : (1 - share) *
        (rest > 0 ? c.weight / rest : 1 / (s.criteria.length - 1)),
  );
}
export function analyze(input: Scenario, criterion: number) {
  const scenario = validate(input);
  const weights = normalizedWeights(scenario);
  const baseline = scoresAt(scenario, weights);
  const start = scoresAt(scenario, variedWeights(scenario, criterion, 0));
  const end = scoresAt(scenario, variedWeights(scenario, criterion, 1));
  const lines = start.map((intercept, i) => ({
    intercept,
    slope: end[i] - intercept,
  }));
  const points = [0, 1];
  for (let i = 0; i < lines.length; i++)
    for (let j = i + 1; j < lines.length; j++) {
      const delta = lines[i].slope - lines[j].slope;
      if (delta === 0) continue;
      const at = (lines[j].intercept - lines[i].intercept) / delta;
      if (at > 0 && at < 1) points.push(at);
    }
  // Retain distinct floating-point crossings; never use a coarse sampling grid.
  const breaks = [...new Set(points)].sort((a, b) => a - b);
  const at = (share: number) => lines.map((l) => l.intercept + l.slope * share);
  const intervals = breaks.slice(0, -1).map((from, i) => ({
    from,
    to: breaks[i + 1],
    leaders: leaders(at((from + breaks[i + 1]) / 2)),
  }));
  const boundaries = breaks.map((share) => ({
    share,
    scores: at(share),
    leaders: leaders(at(share)),
  }));
  return {
    scenario,
    criterion,
    weights,
    baseline,
    baselineLeaders: leaders(baseline),
    lines,
    intervals,
    boundaries,
    equalRemainder: scenario.criteria.every(
      (c, i) => i === criterion || c.weight === 0,
    ),
  };
}
export type Analysis = ReturnType<typeof analyze>;
