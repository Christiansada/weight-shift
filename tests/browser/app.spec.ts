import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { sample } from '../../src/model';
test('baseline ties, continuous exploration and actual export', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('#winner')).toHaveText(
    'Library room + Community hall',
  );
  await page.getByLabel('Explored weight').fill('80');
  await expect(page.locator('#winner')).toHaveText('Library room');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export analysis JSON' }).click();
  const download = await downloadPromise;
  const report = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(report.explored.share).toBe(0.8);
  expect(report.scenario).toEqual(sample);
  expect(report.explored.leaders).toEqual([0]);
  expect(report.boundaries.length).toBeGreaterThan(2);
  expect(report.dataSource).toContain('Synthetic');
  await page.getByRole('button', { name: 'Return to baseline weight' }).click();
  await expect(page.locator('#winner')).toHaveText(
    'Library room + Community hall',
  );
  expect(errors).toEqual([]);
});
test('editing invalidates results; blank scores and zero total are rejected', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Library room: Accessibility score').fill('');
  await expect(page.locator('#results')).toBeHidden();
  await expect(page.locator('#export')).toBeDisabled();
  await page.getByRole('button', { name: 'Apply scores & weights' }).click();
  await expect(page.getByRole('alert')).toContainText('Score must');
  await page.getByRole('button', { name: 'Reset synthetic example' }).click();
  for (const field of await page.getByLabel('Relative weight').all())
    await field.fill('0');
  await page.getByRole('button', { name: 'Apply scores & weights' }).click();
  await expect(page.getByRole('alert')).toContainText('At least one weight');
});
test('imports custom dimensions safely and supports zero remainder', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByText('Use your own scenario · JSON import').click();
  const scenario = {
    title: '<img src=x onerror=alert(1)>',
    criteria: [
      { name: 'A', weight: 100 },
      { name: 'B', weight: 0 },
    ],
    options: [
      { name: 'One', scores: [100, 0] },
      { name: 'Two', scores: [0, 100] },
    ],
  };
  await page.getByLabel('Scenario JSON').fill(JSON.stringify(scenario));
  await expect(page.locator('#results')).toBeHidden();
  await page.getByRole('button', { name: 'Import scenario' }).click();
  await expect(page.locator('#decision-name')).toHaveText(scenario.title);
  await expect(page.locator('#decision-name img')).toHaveCount(0);
  await expect(page.locator('#remainder')).toContainText('split equally');
  await page.getByLabel('Explored weight').fill('50');
  await expect(page.locator('#winner')).toHaveText('One + Two');
  await page.getByLabel('Scenario JSON').fill('{');
  await page.getByRole('button', { name: 'Import scenario' }).click();
  await expect(page.getByRole('alert')).toContainText('valid JSON');
  await expect(page.locator('#export')).toBeDisabled();
});
test('keyboard controls, criterion selection and audit', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to workbench' }),
  ).toBeFocused();
  await page.getByLabel('Criterion to vary').selectOption('1');
  await expect(page.locator('#share-value')).toHaveText('35.00%');
  await page.getByLabel('Explored weight').focus();
  await page.keyboard.press('End');
  await expect(page.locator('#winner')).toHaveText('Studio space');
  await page.getByText('Inspect intervals & boundary ties').click();
  expect(await page.locator('#boundaries li').count()).toBeGreaterThan(2);
  await page.getByRole('button', { name: 'Reset synthetic example' }).click();
  await expect(page.locator('#share-value')).toHaveText('40.00%');
});
for (const width of [320, 390, 768, 1440])
  test(`accessible layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
test('maximum scenario and doubled text fit a narrow viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  await page.getByText('Use your own scenario · JSON import').click();
  await page.getByLabel('Scenario JSON').fill(
    JSON.stringify({
      title: 'A'.repeat(60),
      criteria: Array.from({ length: 6 }, (_, i) => ({
        name: `${i}${'C'.repeat(58)}`,
        weight: 1,
      })),
      options: Array.from({ length: 8 }, (_, i) => ({
        name: `${i}${'O'.repeat(58)}`,
        scores: [1, 2, 3, 4, 5, 6],
      })),
    }),
  );
  await page.getByRole('button', { name: 'Import scenario' }).click();
  await page.addStyleTag({ content: ':root{font-size:32px}' });
  const overflow = await page.evaluate(() =>
    [...document.querySelectorAll('body *')]
      .filter(
        (el) =>
          el.getBoundingClientRect().right > innerWidth &&
          !el.closest('.table-wrap'),
      )
      .map(
        (el) =>
          `${el.tagName}.${el.className}: ${el.getBoundingClientRect().right}`,
      ),
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    overflow.join('\n'),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
