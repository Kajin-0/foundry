import {test,expect} from '@playwright/test';
test('single room hosts LPE and ion mill with one WebGL canvas',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await expect(page.locator('#hud h1')).toHaveText('FOUNDRY');
 await expect(page.locator('canvas')).toHaveCount(1);
 await expect(page.locator('#tabOverview')).toHaveClass(/active/);
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics?.().rendererCount)).toBe(1);
 const overview=await page.evaluate(()=>window.__foundryDiagnostics());
 expect(overview.detailed).toEqual({lpe:false,imm:false,mbe:false});
 expect(overview.proxies).toEqual({lpe:true,imm:true,mbe:true});
 expect(overview.mbeLoaded).toBe(false);
 expect(overview.pixelRatio).toBeLessThanOrEqual(1.25);
 await page.locator('#tabLPE').click();
 await expect(page.locator('#lpeControls')).toBeVisible();
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
 await page.locator('#tabOverview').click();
 expect((await page.evaluate(()=>window.__foundryDiagnostics())).proxies).toEqual({lpe:true,imm:true,mbe:true});
 expect(errors).toEqual([]);
});
test('MBE loads lazily into same room with no extra WebGL renderer',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 expect((await page.evaluate(()=>window.__foundryDiagnostics())).mbeLoaded).toBe(false);
 await page.locator('#tabMBE').click();
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics?.().mbeLoaded),{timeout:30000}).toBe(true);
 await expect(page.locator('#mbeControls')).toBeVisible();
 await expect(page.locator('#mbeRheedSvg')).toBeVisible();
 await expect(page.locator('#mbeV1')).not.toHaveText('—');
 await expect(page.locator('canvas')).toHaveCount(1);
 const d=await page.evaluate(()=>window.__foundryDiagnostics());
 expect(d.detailed).toEqual({lpe:false,imm:false,mbe:true});
 expect(d.proxies).toEqual({lpe:true,imm:true,mbe:false});
 expect(d.rendererCount).toBe(1);
 await page.locator('#mbePlayBtn').click();
 await expect(page.locator('#mbePlayBtn')).toContainText('Stop');
 await page.locator('#mbeCut').evaluate(el=>{el.value='75';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.waitForTimeout(250);
 await page.locator('#mbePlayBtn').click();
 await expect(page.locator('#mbePlayBtn')).toContainText('Run');
 await page.locator('#tabLPE').click();
 await expect(page.locator('#lpeControls')).toBeVisible();
 await page.locator('#tabMBE').click();
 expect((await page.evaluate(()=>window.__foundryDiagnostics())).rendererCount).toBe(1);
 expect(errors).toEqual([]);
});
test('old MBE address redirects to station in shared Foundry',async({page})=>{
 await page.goto('/mbe.html');
 await expect(page).toHaveURL(/index\.html\?tool=mbe/);
 await expect(page.locator('#tabMBE')).toHaveClass(/active/);
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics?.().mbeLoaded),{timeout:30000}).toBe(true);
 await expect(page.locator('canvas')).toHaveCount(1);
});
test('small viewport can select all three stations',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await expect(page.locator('#tabMBE')).toBeVisible();
 await page.locator('#tabMBE').click();
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics?.().mbeLoaded),{timeout:30000}).toBe(true);
 await expect(page.locator('#mbeControls')).toBeVisible();
 await expect(page.locator('#mbePlayBtn')).toBeVisible();
 await expect(page.locator('canvas')).toHaveCount(1);
 expect((await page.evaluate(()=>window.__foundryDiagnostics())).pixelRatio).toBeLessThanOrEqual(1);
});

test('lossless MBE batching lowers actual GPU draw calls without reducing triangles',async({page})=>{
 const getMetrics=async()=>{
  await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics()?.mbeLoaded),{timeout:30000}).toBe(true);
  await page.waitForTimeout(1800);
  return await page.evaluate(()=>window.__foundryDiagnostics());
 };
 await page.goto('/?tool=mbe');
 const batched=await getMetrics();
 expect(batched.mbeRenderOptimization.totalSavedDrawCalls).toBeGreaterThan(8);
 await page.addInitScript(()=>{window.__foundryDisableBatching=true});
 await page.reload();
 const unbatched=await getMetrics();
 console.log('MBE draw-call A/B (same geometry):',JSON.stringify({
  savedMeshCalls:batched.mbeRenderOptimization.totalSavedDrawCalls,
  batchedCalls:batched.drawCalls,unbatchedCalls:unbatched.drawCalls,
  batchedTriangles:batched.triangles,unbatchedTriangles:unbatched.triangles,
  batchedCpuP95:batched.cpuRenderP95ms,unbatchedCpuP95:unbatched.cpuRenderP95ms,
 }));
 // Equivalent model geometry and materials: no mesh simplification.
 expect(unbatched.drawCalls).toBeGreaterThan(batched.drawCalls+8);
 expect(unbatched.triangles).toBe(batched.triangles);
});
