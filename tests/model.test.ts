import { describe, expect, it } from 'vitest';
import {
  analyze,
  leaders,
  normalizedWeights,
  parseScenario,
  sample,
  scoresAt,
  validate,
  variedWeights,
  type Scenario,
} from '../src/model';
const two: Scenario = {
  title: 'Trade-off',
  criteria: [
    { name: 'A', weight: 1 },
    { name: 'B', weight: 1 },
  ],
  options: [
    { name: 'First', scores: [100, 0] },
    { name: 'Second', scores: [0, 100] },
  ],
};
it('matches a hand-calculated crossing and baseline tie', () => {
  const a = analyze(two, 0);
  expect(a.baseline).toEqual([50, 50]);
  expect(a.baselineLeaders).toEqual([0, 1]);
  expect(a.boundaries.map((b) => b.share)).toEqual([0, 0.5, 1]);
  expect(a.boundaries[1].leaders).toEqual([0, 1]);
  expect(a.intervals.map((b) => b.leaders)).toEqual([[1], [0]]);
});
it('computes the illustrative baseline exactly within floating-point precision', () => {
  const a = analyze(sample, 0);
  expect(a.baseline[0]).toBeCloseTo(80);
  expect(a.baseline[1]).toBeCloseTo(71);
  expect(a.baseline[2]).toBeCloseTo(80);
  expect(a.baseline[3]).toBeCloseTo(61.75);
  expect(a.baselineLeaders).toEqual([0, 2]);
});
it('preserves remainder ratios and endpoints', () => {
  variedWeights(sample, 0, 0.4).forEach((value, i) =>
    expect(value).toBeCloseTo(normalizedWeights(sample)[i], 14),
  );
  expect(variedWeights(sample, 0, 1)).toEqual([1, 0, 0]);
  expect(
    variedWeights(sample, 0, 0)[1] / variedWeights(sample, 0, 0)[2],
  ).toBeCloseTo(35 / 25);
});
it('uses an explicit equal remainder when all other weights are zero', () => {
  const s = structuredClone(sample);
  s.criteria.forEach((c, i) => (c.weight = i ? 0 : 100));
  expect(variedWeights(s, 0, 0.2)).toEqual([0.2, 0.4, 0.4]);
  expect(analyze(s, 0).equalRemainder).toBe(true);
});
it('retains permanently tied options and endpoint-only ties', () => {
  const s = structuredClone(two);
  s.options[1].scores = [100, 0];
  expect(analyze(s, 0).intervals[0].leaders).toEqual([0, 1]);
  s.options[1].scores = [100, 50];
  expect(analyze(s, 0).boundaries.at(-1)!.leaders).toEqual([0, 1]);
  expect(analyze(s, 0).intervals[0].leaders).toEqual([1]);
});
it('retains simultaneous three-way crossings', () => {
  const s = structuredClone(two);
  s.options.push({ name: 'Middle', scores: [50, 50] });
  const a = analyze(s, 0);
  expect(a.boundaries[1].leaders).toEqual([0, 1, 2]);
});
it('does not mutate input and is invariant to weight scaling', () => {
  const before = JSON.stringify(sample);
  const a = analyze(sample, 2);
  const s = structuredClone(sample);
  s.criteria.forEach((c) => (c.weight *= 2));
  expect(analyze(s, 2).baseline).toEqual(a.baseline);
  expect(JSON.stringify(sample)).toBe(before);
});
it('handles zero and one hundred scores', () => {
  const s = structuredClone(two);
  s.options[0].scores = [0, 0];
  s.options[1].scores = [100, 100];
  expect(analyze(s, 0).baseline).toEqual([0, 100]);
});
it('tie tolerance has a defined score-unit boundary', () => {
  expect(leaders([50, 50 + 1e-9])).toEqual([0, 1]);
  expect(leaders([50, 50 + 1e-6])).toEqual([1]);
});
it('checks 200 deterministic fixtures against independent direct weighted sums', () => {
  let seed = 123456;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (let trial = 0; trial < 200; trial++) {
    const s: Scenario = {
      title: 'Generated fixture',
      criteria: Array.from({ length: 2 + (trial % 5) }, (_, i) => ({
        name: `C${i}`,
        weight: 1 + Math.floor(random() * 100),
      })),
      options: [],
    };
    s.options = Array.from({ length: 2 + (trial % 7) }, (_, i) => ({
      name: `O${i}`,
      scores: s.criteria.map(() => Math.floor(random() * 101)),
    }));
    const criterion = trial % s.criteria.length;
    const a = analyze(s, criterion);
    for (const interval of a.intervals)
      for (const fraction of [0.25, 0.5, 0.75]) {
        const share = interval.from + (interval.to - interval.from) * fraction;
        const rest = s.criteria.reduce(
          (sum, c, i) => sum + (i !== criterion ? c.weight : 0),
          0,
        );
        const oracle = s.options.map((o) => {
          let score = o.scores[criterion] * share;
          for (let i = 0; i < s.criteria.length; i++)
            if (i !== criterion)
              score +=
                ((o.scores[i] * s.criteria[i].weight) / rest) * (1 - share);
          return score;
        });
        const best = Math.max(...oracle);
        const expected = oracle.flatMap((score, i) =>
          best - score <= 1e-8 ? [i] : [],
        );
        expect(interval.leaders).toEqual(expected);
        scoresAt(s, variedWeights(s, criterion, share)).forEach((score, i) =>
          expect(score).toBeCloseTo(oracle[i], 10),
        );
      }
    expect(a.intervals[0].from).toBe(0);
    expect(a.intervals.at(-1)!.to).toBe(1);
  }
});
describe('input boundaries', () => {
  it.each([NaN, Infinity, -1, 101, '50', null])(
    'rejects invalid score %s',
    (v) => {
      const s = structuredClone(two) as unknown as {
        options: { scores: unknown[] }[];
      };
      s.options[0].scores[0] = v;
      expect(() => validate(s)).toThrow();
    },
  );
  it.each([-1, Infinity, NaN, 1001, '40'])('rejects invalid weight %s', (v) => {
    const s = structuredClone(two) as unknown as {
      criteria: { weight: unknown }[];
    };
    s.criteria[0].weight = v;
    expect(() => validate(s)).toThrow();
  });
  it.each([-1, 2, 0.5, NaN])('rejects invalid criterion %s', (v) =>
    expect(() => analyze(two, v)).toThrow(),
  );
  it.each([-1, 1.01, NaN])('rejects invalid share %s', (v) =>
    expect(() => variedWeights(two, 0, v)).toThrow(),
  );
  it('rejects zero total, duplicate names, missing scores, blank title and invalid group sizes', () => {
    const mutations: ((s: Scenario) => void)[] = [
      (s) => s.criteria.forEach((c) => (c.weight = 0)),
      (s) => (s.options[1].name = ' first '),
      (s) => (s.criteria[1].name = 'A'),
      (s) => s.options[0].scores.pop(),
      (s) => (s.title = ' '),
      (s) => (s.title = 'a\nb'),
      (s) => s.criteria.pop(),
      (s) => s.options.pop(),
      (s) => (s.title = 'x'.repeat(61)),
    ];
    for (const mutate of mutations) {
      const s = structuredClone(two);
      mutate(s);
      expect(() => validate(s)).toThrow();
    }
  });
  it('roundtrips the example and rejects invalid/oversized JSON', () => {
    expect(parseScenario(JSON.stringify(sample))).toEqual(sample);
    for (const text of ['{', 'null', '[]', '{}', ' '.repeat(65537)])
      expect(() => parseScenario(text)).toThrow();
  });
});
