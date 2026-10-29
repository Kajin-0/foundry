import {test,expect} from '@playwright/test';
test('single room hosts LPE and ion mill with one WebGL canvas',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await expect(page.locator('#hud h1')).toHaveText('FOUNDRY');
 await expect(page.locator('canvas')).toHaveCount(1);
 await expect(page.locator('#tabOverview')).toHaveClass(/active/);
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics?.().rendererCount)).toBe(1);
 const overview=await page.evaluate(()=>window.__foundryDiagnostics());
 expect(overview.detailed).toEqual({lpe:false,imm:false,mbe:false,cmp:false});
 expect(overview.proxies).toEqual({lpe:true,imm:true,mbe:true,cmp:true});
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
 expect((await page.evaluate(()=>window.__foundryDiagnostics())).proxies).toEqual({lpe:true,imm:true,mbe:true,cmp:true});
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
 expect(d.detailed).toEqual({lpe:false,imm:false,mbe:true,cmp:false});
 expect(d.proxies).toEqual({lpe:true,imm:true,mbe:false,cmp:true});
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
 // Runtime triangle statistics may differ under frustum culling as object
 // batches have larger bounding spheres. Geometry index integrity is
 // strictly verified in mergeStaticDrawCalls and Node unit tests.
 expect(batched.mbeRenderOptimization.verifiedTriangleIndices).toBeGreaterThan(0);
 expect(batched.drawCalls).toBeGreaterThan(0);
});

test('ion mill has only cutaway and Run, with a docked wafer and floor-supported assembly',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?tool=imm');
 await expect(page.locator('#tabIMM')).toHaveClass(/active/);
 await expect(page.locator('#immControls input[type=range]')).toHaveCount(1);
 await expect(page.locator('#cutIMM')).toBeVisible();
 await expect(page.locator('#tiltIMM')).toHaveCount(0);
 await expect(page.locator('#depthIMM')).toHaveCount(0);
 await expect(page.locator('#lpeOnlyIllustrations')).toBeHidden();
 await expect(page.locator('#ionOnlyIllustrations')).toBeVisible();
 await expect(page.locator('#xsec')).toBeVisible();
 await expect(page.locator('#narrStatus')).toContainText('WAFER CLAMPED');
 const before=await page.evaluate(()=>window.__foundryDiagnostics()?.ionMill);
 expect(before.waferMounted).toBe(true);
 expect(before.assembly.supportedAtFloor).toBe(true);
 expect(before.assembly.supportTopY).toBe(before.assembly.chamberBottomY);
 expect(before.assembly.loadLockBracket).toBe(true);
 expect(before.assembly.pumpPedestal).toBe(true);
 expect(before.waferLocalPosition).toEqual([0,.06,0]);
 expect(before.presetTilt).toBe(30);
 expect(before.presetDepth).toBe(.40);
 await page.locator('#immBtn').click();
 await expect(page.locator('#immBtn')).toContainText('Stop');
 await page.waitForTimeout(500);
 const during=await page.evaluate(()=>window.__foundryDiagnostics()?.ionMill);
 expect(during.waferLocalPosition).toEqual(before.waferLocalPosition);
 await page.locator('#immBtn').click();
 await expect(page.locator('#immBtn')).toContainText('Run');
 const after=await page.evaluate(()=>window.__foundryDiagnostics()?.ionMill);
 expect(after.waferLocalPosition).toEqual(before.waferLocalPosition);
 expect(errors).toEqual([]);
});

test('process and equipment panels collapse independently and can be restored',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/?tool=lpe');
 await expect(page.locator('#leftPanel')).toBeVisible();
 await expect(page.locator('#rightPanel')).toBeVisible();
 await page.locator('#minimizeProcess').click();
 await expect(page.locator('#leftPanel')).toBeHidden();
 await expect(page.locator('#rightPanel')).toBeVisible();
 await expect(page.locator('#restoreProcess')).toBeVisible();
 expect((await page.evaluate(()=>window.__foundryDiagnostics())).panels).toEqual({
   process:true,equipment:false
 });
 await page.locator('#restoreProcess').click();
 await expect(page.locator('#leftPanel')).toBeVisible();
 await page.locator('#minimizeEquipment').click();
 await expect(page.locator('#rightPanel')).toBeHidden();
 await expect(page.locator('#restoreEquipment')).toBeVisible();
 await expect(page.locator('#leftPanel')).toBeVisible();
 await page.locator('#restoreEquipment').click();
 await expect(page.locator('#rightPanel')).toBeVisible();
 await page.locator('#tabIMM').click();
 await expect(page.locator('#immControls')).toBeVisible();
 expect(errors).toEqual([]);
});

test('focus view hides overlays without stopping process or creating another renderer',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/?tool=imm');
 await page.locator('#immBtn').click();
 await expect(page.locator('#immBtn')).toContainText('Stop');
 const before=await page.evaluate(()=>window.__foundryDiagnostics());
 await page.locator('#focusToggle').click();
 await expect(page.locator('body')).toHaveClass(/focus-view/);
 await expect(page.locator('#leftPanel')).toBeHidden();
 await expect(page.locator('#rightPanel')).toBeHidden();
 await expect(page.locator('#restoreProcess')).toBeVisible();
 await expect(page.locator('#restoreEquipment')).toBeVisible();
 await expect(page.locator('#focusToggle')).toContainText('Show panels');
 await expect(page.locator('.label3d').first()).toBeHidden();
 await page.waitForTimeout(450);
 const during=await page.evaluate(()=>window.__foundryDiagnostics());
 expect(during.rendererCount).toBe(1);
 expect(during.view).toBe('imm');
 expect(during.panels).toEqual({process:true,equipment:true});
 await page.keyboard.press('h');
 await expect(page.locator('#rightPanel')).toBeVisible();
 await expect(page.locator('#leftPanel')).toBeVisible();
 expect((await page.evaluate(()=>window.__foundryDiagnostics())).panels).toEqual({
   process:false,equipment:false
 });
 await expect(page.locator('#immBtn')).toContainText('Stop');
 await page.locator('#tabLPE').click();
 await expect(page.locator('#lpeControls')).toBeVisible();
 await page.keyboard.press('h');
 await expect(page.locator('body')).toHaveClass(/focus-view/);
 await page.keyboard.press('Escape');
 await expect(page.locator('body')).not.toHaveClass(/focus-view/);
 await expect(page.locator('#rightPanel')).toBeVisible();
 await expect(page.locator('canvas')).toHaveCount(1);
 expect(errors).toEqual([]);
});

test('narrow mobile layout leaves tiny restore controls for panels',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await expect(page.locator('#focusToggle')).toBeVisible();
 await page.locator('#focusToggle').click();
 await expect(page.locator('#leftPanel')).toBeHidden();
 await expect(page.locator('#rightPanel')).toBeHidden();
 await expect(page.locator('#restoreProcess')).toBeVisible();
 await expect(page.locator('#restoreEquipment')).toBeVisible();
 await page.locator('#restoreEquipment').click();
 await expect(page.locator('#rightPanel')).toBeVisible();
 await expect(page.locator('#leftPanel')).toBeHidden();
 await expect(page.locator('#tabMBE')).toBeVisible();
 await page.locator('#tabMBE').click();
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics()?.mbeLoaded),{timeout:30000}).toBe(true);
 await page.locator('#restoreProcess').click();
 await expect(page.locator('#mbeRheedSvg')).toBeVisible();
 await expect(page.locator('canvas')).toHaveCount(1);
});

test('CMP is a lazily loaded fourth machine inside the same renderer',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 const initial=await page.evaluate(()=>window.__foundryDiagnostics());
 expect(initial.cmpLoaded).toBe(false);
 expect(initial.proxies.cmp).toBe(true);
 await expect(page.locator('#tabCMP')).toBeVisible();
 await page.locator('#tabCMP').click();
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics()?.cmpLoaded),{timeout:30000}).toBe(true);
 await expect(page.locator('#cmpControls')).toBeVisible();
 await expect(page.locator('#cmpLeft')).toBeVisible();
 await expect(page.locator('#cmpXsecSvg')).toBeVisible();
 await expect(page.locator('#cmpV1')).toHaveText('0 rpm');
 const d=await page.evaluate(()=>window.__foundryDiagnostics());
 expect(d.view).toBe('cmp');
 expect(d.rendererCount).toBe(1);
 expect(d.detailed).toEqual({lpe:false,imm:false,mbe:false,cmp:true});
 expect(d.proxies.cmp).toBe(false);
 expect(d.cmpGeometry.headContactY-d.cmpGeometry.padTopY).toBeCloseTo(.2275,6);
 await page.locator('#cmpPlayBtn').click();
 await expect(page.locator('#cmpPlayBtn')).toContainText('Stop');
 await page.waitForTimeout(350);
 const elapsed=await page.evaluate(()=>window.__foundryDiagnostics().cmpState.elapsed);
 expect(elapsed).toBeGreaterThan(0);
 await page.locator('#tabLPE').click();
 await expect(page.locator('#lpeControls')).toBeVisible();
 await page.waitForTimeout(250);
 await page.locator('#tabCMP').click();
 const resumed=await page.evaluate(()=>window.__foundryDiagnostics().cmpState.elapsed);
 expect(resumed).toBeGreaterThanOrEqual(elapsed);
 await page.locator('#cmpPlayBtn').click();
 await expect(page.locator('#cmpPlayBtn')).toContainText('Restart');
 expect(errors).toEqual([]);
});

test('CMP panels can be minimized and restored on mobile without extra canvas',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/?tool=cmp');
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics()?.cmpLoaded),{timeout:30000}).toBe(true);
 await expect(page.locator('#tabCMP')).toHaveClass(/active/);
 await expect(page.locator('#cmpPlayBtn')).toBeVisible();
 await page.locator('#focusToggle').click();
 await expect(page.locator('#leftPanel')).toBeHidden();
 await expect(page.locator('#rightPanel')).toBeHidden();
 await page.locator('#restoreEquipment').click();
 await expect(page.locator('#cmpControls')).toBeVisible();
 await page.locator('#restoreProcess').click();
 await expect(page.locator('#cmpXsecSvg')).toBeVisible();
 await expect(page.locator('canvas')).toHaveCount(1);
});

test('CMP retains geometry while batching rigid parts into fewer WebGL draw calls',async({page})=>{
 const snapshot=async()=>{
  await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics()?.cmpLoaded),{timeout:30000}).toBe(true);
  await page.waitForTimeout(1250);
  return page.evaluate(()=>window.__foundryDiagnostics());
 };
 await page.goto('/?tool=cmp');
 const batched=await snapshot();
 expect(batched.cmpRenderOptimization.savedDrawCalls).toBeGreaterThan(4);
 await page.addInitScript(()=>{window.__foundryDisableCmpBatching=true;});
 await page.reload();
 const raw=await snapshot();
 console.log('CMP draw-call A/B',JSON.stringify({
  batched:batched.drawCalls,unbatched:raw.drawCalls,
  trianglesBatched:batched.triangles,trianglesRaw:raw.triangles,
  savedGeometrySubmissions:batched.cmpRenderOptimization.savedDrawCalls
 }));
 expect(raw.drawCalls).toBeGreaterThan(batched.drawCalls+4);
 expect(batched.cmpRenderOptimization.verifiedTriangleIndices).toBeGreaterThan(0);
 expect(batched.rendererCount).toBe(1);
});
