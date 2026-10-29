import {test, expect} from '@playwright/test';
test('boots and controls both independent process tools', async ({page}) => {
  const pageErrors=[];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#hud h1')).toHaveText('LPE + ION MILL');
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.locator('#t1')).not.toHaveText('—');
  await page.locator('#playBtn').click();
  await expect(page.locator('#playBtn')).toContainText('Stop');
  await page.locator('#playBtn').click();
  await expect(page.locator('#playBtn')).toContainText('Run');
  await page.locator('#tabIMM').click();
  await expect(page.locator('#immControls')).toBeVisible();
  await page.locator('#immBtn').click();
  await expect(page.locator('#immBtn')).toContainText('Stop');
  await page.locator('#immBtn').click();
  await expect(page.locator('#immBtn')).toContainText('Run');
  await page.locator('#tabLPE').click();
  await expect(page.locator('#lpeControls')).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('MBE page boots and starts/stops with valid live readouts', async ({page}) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/mbe.html');
  await expect(page.locator('#hud h1')).toHaveText('MBE');
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.locator('#v1')).not.toHaveText('—');
  await expect(page.locator('#rheedSvg')).toBeVisible();
  await page.locator('#playBtn').click();
  await expect(page.locator('#playBtn')).toContainText('Stop');
  await page.locator('#cut').evaluate(el=>{el.value='75';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForTimeout(200);
  await page.locator('#playBtn').click();
  await expect(page.locator('#playBtn')).toContainText('Run');
  await expect(page.locator('a[href="./index.html"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});
