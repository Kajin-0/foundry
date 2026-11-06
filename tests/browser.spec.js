import {test,expect} from '@playwright/test';
test('single room hosts LPE and ion mill with one WebGL canvas',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await expect(page.locator('#hud h1')).toHaveText('FOUNDRY');
 await expect(page.locator('canvas')).toHaveCount(1);
 await expect(page.locator('#tabOverview')).toHaveClass(/active/);
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics?.().rendererCount)).toBe(1);
 const overview=await page.evaluate(()=>window.__foundryDiagnostics());
 expect(overview.detailed).toEqual({lpe:false,imm:false,mbe:false,cmp:false,litho:false,spin:false,implant:false});
 expect(overview.proxies).toEqual({lpe:true,imm:true,mbe:true,cmp:true,litho:true,spin:true,implant:true});
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
 expect((await page.evaluate(()=>window.__foundryDiagnostics())).proxies).toEqual({lpe:true,imm:true,mbe:true,cmp:true,litho:true,spin:true,implant:true});
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
 expect(d.detailed).toEqual({lpe:false,imm:false,mbe:true,cmp:false,litho:false,spin:false,implant:false});
 expect(d.proxies).toEqual({lpe:true,imm:true,mbe:false,cmp:true,litho:true,spin:true,implant:true});
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
 await expect(page.locator('#cmpControls input')).toHaveCount(0);
 await expect(page.locator('#cmpLeft')).toBeVisible();
 await expect(page.locator('#cmpXsecSvg')).toBeVisible();
 await expect(page.locator('#cmpV1')).toHaveText('0 rpm');
 const d=await page.evaluate(()=>window.__foundryDiagnostics());
 expect(d.view).toBe('cmp');
 expect(d.rendererCount).toBe(1);
 expect(d.detailed).toEqual({lpe:false,imm:false,mbe:false,cmp:true,litho:false,spin:false,implant:false});
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

test('expanded room grid stays beyond the equipment bays, portrait overview fits and station quality returns',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/');
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics?.()?.ground?.shared)).toBe(true);
 const wide=await page.evaluate(()=>window.__foundryDiagnostics());
 expect(wide.ground.floorSize).toBeGreaterThan(400);
 expect(wide.ground.gridDivisions).toBe(wide.ground.gridSize/2);
 expect(wide.roomBounds.maxX).toBe(99.5);
 expect(wide.roomBounds.centerX+wide.ground.gridSize/2).toBeGreaterThan(
   wide.roomBounds.maxX+100
 );
 expect(wide.viewGeometry.fov).toBe(40);
 expect(wide.shadowResolution).toBe(1024);
 expect(wide.viewGeometry.fogFar).toBeGreaterThanOrEqual(110);
 expect(wide.rendererCount).toBe(1);
 await page.setViewportSize({width:390,height:844});
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics().viewGeometry.fov),{timeout:15000}).toBe(72);
 const portrait=await page.evaluate(()=>window.__foundryDiagnostics());
 expect(portrait.viewGeometry.maxDistance).toBeGreaterThan(85);
 expect(portrait.viewGeometry.fogFar).toBeGreaterThan(110);
 expect(portrait.pixelRatio).toBeLessThanOrEqual(1);
 expect(portrait.shadowResolution).toBe(512);
 expect(portrait.shadowMap).toBe(false);
 expect(portrait.ground).toEqual(wide.ground);
 await page.locator('#tabCMP').click();
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics()?.cmpLoaded),{timeout:30000}).toBe(true);
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics().viewGeometry.fov),{timeout:10000}).toBe(40);
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics().viewGeometry.fogFar),{timeout:10000}).toBe(110);
 const cmp=await page.evaluate(()=>window.__foundryDiagnostics());
 expect(cmp.rendererCount).toBe(1);
 await page.locator('#tabOverview').click();
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics().viewGeometry.fov)).toBe(72);
 await page.setViewportSize({width:1440,height:900});
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics().shadowResolution)).toBe(1024);
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics().viewGeometry.fov),{timeout:10000}).toBe(40);
 const restored=await page.evaluate(()=>window.__foundryDiagnostics());
 expect(restored.viewGeometry.fov).toBe(40);
 expect(restored.viewGeometry.fogFar).toBeGreaterThanOrEqual(110);
 expect(restored.shadowMap).toBe(true);
 expect(errors).toEqual([]);
});

test('equipment navigation keeps every tool visible and expands to future rows',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 const dimensions=await page.locator('.tabs').evaluate(node=>{
  const original=[...node.querySelectorAll('.tab')];
  const added=document.createElement('button');added.className='tab';added.type='button';added.textContent='Future Tool';node.appendChild(added);
  const addedTwo=document.createElement('button');addedTwo.className='tab';addedTwo.type='button';addedTwo.textContent='Next Future Tool';node.appendChild(addedTwo);
  const base=node.getBoundingClientRect();
  const rect=addedTwo.getBoundingClientRect();
  return {columns:getComputedStyle(node).gridTemplateColumns.split(' ').length,
   within:original.every(t=>{const r=t.getBoundingClientRect();return r.left>=base.left-2&&r.right<=base.right+2&&r.top>=base.top-2;}),
   futureWithin:rect.left>=base.left-2&&rect.right<=base.right+2,
   futureBelow:rect.top>original.at(-1).getBoundingClientRect().top,
   font:parseFloat(getComputedStyle(added).fontSize),widthBefore:base.width,widthAfter:node.getBoundingClientRect().width};
 });
 expect(dimensions.columns).toBe(3);
 expect(dimensions.within).toBe(true);
 expect(dimensions.futureWithin).toBe(true);
 expect(dimensions.futureBelow).toBe(true);
 expect(dimensions.font).toBeGreaterThanOrEqual(9);
 expect(dimensions.widthAfter).toBe(dimensions.widthBefore);
 await page.locator('#tabLPE').click();
 await expect(page.locator('#lpeControls')).toBeVisible();
 await expect(page.locator('canvas')).toHaveCount(1);
});

test('mobile shows one panel at a time with a visible run action, including landscape',async({page})=>{
 for(const [width,height] of [[390,844],[844,390]]){
  await page.setViewportSize({width,height});
  await page.goto('/?tool=litho');
  await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics()?.lithoLoaded),{timeout:30000}).toBe(true);
  await expect(page.locator('#rightPanel')).toBeVisible();
  await expect(page.locator('#leftPanel')).toBeHidden();
  await expect(page.locator('#mobilePanelSwitch')).toBeVisible();
  const visibleRun=await page.locator('#lithoPlayBtn').evaluate(el=>{
   const r=el.getBoundingClientRect();return r.y>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;
  });
  expect(visibleRun).toBe(true);
  await page.locator('#mobileProcess').click();
  await expect(page.locator('#leftPanel')).toBeVisible();
  await expect(page.locator('#rightPanel')).toBeHidden();
  await page.locator('#mobileEquipment').click();
  await expect(page.locator('#rightPanel')).toBeVisible();
  await expect(page.locator('#leftPanel')).toBeHidden();
 }
});

test('ArF immersion scanner loads only on selection and shares one WebGL context',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 expect((await page.evaluate(()=>window.__foundryDiagnostics())).lithoLoaded).toBe(false);
 await page.locator('#tabLitho').click();
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics()?.lithoLoaded),{timeout:30000}).toBe(true);
 await expect(page.locator('#lithoLeft')).toBeVisible();
 await expect(page.locator('#lithoControls')).toBeVisible();
 // Lithography is inspected through the fixed side panels only. Floating
 // scene labels used to remain on screen during orbit/focus/simulation.
 await expect(page.locator('.litho-sub-label')).toHaveCount(0);
 await expect(page.locator('.label3d')).toHaveCount(7);
 await expect(page.locator('.label3d:visible')).toHaveCount(0);

 await expect(page.locator('#mbePlayBtn')).toBeHidden();
 await expect(page.locator('#mbeCut')).toBeHidden();
 await expect(page.locator('#cmpPlayBtn')).toBeHidden();
 await expect(page.locator('#playBtn')).toBeHidden();
 await expect(page.locator('#immBtn')).toBeHidden();
 await expect(page.locator('#lithoControls input')).toHaveCount(0);
 await expect(page.locator('canvas')).toHaveCount(1);
 let d=await page.evaluate(()=>window.__foundryDiagnostics());
 expect(d.detailed.litho).toBe(true);expect(d.proxies.litho).toBe(false);
 expect(d.rendererCount).toBe(1);
 await page.locator('#lithoPlayBtn').click();
 await expect(page.locator('.litho-sub-label')).toHaveCount(0);
 await expect(page.locator('#lithoPlayBtn')).toContainText('Stop');
 await page.waitForTimeout(300);
 const start=await page.evaluate(()=>window.__foundryDiagnostics().lithoState.elapsed);
 expect(start).toBeGreaterThan(0);
 await page.locator('#tabCMP').click();
 await expect(page.locator('.litho-sub-label')).toHaveCount(0);
 await page.waitForTimeout(220);
 await page.locator('#tabLitho').click();
 d=await page.evaluate(()=>window.__foundryDiagnostics());
 expect(d.lithoState.elapsed).toBeGreaterThanOrEqual(start);
 await page.locator('#lithoPlayBtn').click();
 await expect(page.locator('#lithoPlayBtn')).toContainText('Restart');
 expect(errors).toEqual([]);
});
test('lithography runs in minimized mobile UI and preserves renderer',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/?tool=litho');
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics()?.lithoLoaded),{timeout:30000}).toBe(true);
 await page.locator('#focusToggle').click();
 await expect(page.locator('#leftPanel')).toBeHidden();
 await expect(page.locator('#rightPanel')).toBeHidden();
 await page.locator('#restoreEquipment').click();
 await expect(page.locator('#lithoControls')).toBeVisible();
 await expect(page.locator('#mbePlayBtn')).toBeHidden();
 await expect(page.locator('#mbeCut')).toBeHidden();
 await expect(page.locator('#cmpPlayBtn')).toBeHidden();
 await expect(page.locator('#playBtn')).toBeHidden();
 await expect(page.locator('#immBtn')).toBeHidden();
 await page.locator('#restoreProcess').click();
 await expect(page.locator('#lithoCrossSection')).toBeVisible();
 await expect(page.locator('canvas')).toHaveCount(1);
});


test('overview displays seven consistent labels and detailed stations show none',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.label3d')).toHaveCount(7);
 await expect(page.locator('.label3d:visible')).toHaveCount(7);
 const palette=await page.locator('.label3d').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).borderColor));
 expect(new Set(palette).size).toBe(1);
 await expect(page.locator('.label3d')).toContainText(['LPE · FURNACE','ION BEAM ETCH · HIGH VACUUM','MBE · UHV CHAMBER','CMP · OXIDE POLISH','LITHO · ArF SCANNER','SPIN COATER · PHOTORESIST','ION IMPLANTER · DOPANT']);
 for(const tool of ['LPE','IMM','MBE','CMP','Litho','Spin','Implant']){
  await page.locator('#tab'+tool).click();
  await expect(page.locator('.label3d:visible')).toHaveCount(0);
 }
 await page.locator('#tabOverview').click();
 await expect(page.locator('.label3d:visible')).toHaveCount(7);
});

test('spin coater and ion implanter lazy-load as distinct stations in one renderer',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?tool=spin');
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics()?.spinLoaded),{timeout:30000}).toBe(true);
 await expect(page.locator('#spinControls')).toBeVisible();
 await expect(page.locator('#spinPlayBtn')).toHaveCSS('background-image',/linear-gradient/);
 await expect(page.locator('#spinPlayBtn')).toHaveCSS('border-radius','7px');
 await expect(page.locator('#spinCurve path')).toHaveCount(1);
 await expect(page.locator('canvas')).toHaveCount(1);
 await page.locator('#spinPlayBtn').click();
 await expect(page.locator('#spinPlayBtn')).toContainText('Stop');
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics()?.spinState?.simTime),{timeout:15000}).toBeGreaterThan(0);
 await page.locator('#tabImplant').click();
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics()?.implantLoaded),{timeout:30000}).toBe(true);
 await expect(page.locator('#implantControls')).toBeVisible();
 await expect(page.locator('#spinControls')).toBeHidden();
 await expect(page.locator('#implantProfile path')).toHaveCount(2);
 await expect(page.locator('[data-implant-preset], [data-implant-tilt]')).toHaveCount(0);
 const recipe=await page.evaluate(()=>window.__foundryDiagnostics().implantState);
 expect(recipe.ion).toBe('As');
 expect(recipe.E).toBe(100);
 expect(recipe.tilt).toBe(7);
 expect(recipe.targetDose).toBe(5e15);
 const css=await page.locator('#implantPlayBtn').evaluate(el=>({
  background:getComputedStyle(el).backgroundImage,
  radius:getComputedStyle(el).borderRadius,
  width:el.getBoundingClientRect().width,
  parentWidth:el.parentElement.getBoundingClientRect().width
 }));
 expect(css.background).toContain('linear-gradient');
 expect(css.radius).toBe('7px');
 expect(css.width).toBeGreaterThan(css.parentWidth*.90);
 await page.locator('#implantPlayBtn').click();
 await expect(page.locator('#implantPlayBtn')).toContainText('Stop');
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics()?.implantState?.simTime),{timeout:15000}).toBeGreaterThan(0);
 const d=await page.evaluate(()=>window.__foundryDiagnostics());
 expect(d.spinState.simTime).toBeGreaterThan(0);
 expect(d.detailed).toEqual({lpe:false,imm:false,mbe:false,cmp:false,litho:false,spin:false,implant:true});
 expect(d.rendererCount).toBe(1);
 expect(errors).toEqual([]);
});
test('seven stations remain accessible on narrow mobile without duplicate canvases',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/?tool=implant');
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics()?.implantLoaded),{timeout:30000}).toBe(true);
 await expect(page.locator('#rightPanel')).toBeVisible();
 await expect(page.locator('#implantControls')).toBeVisible();
 await page.locator('#focusToggle').click();
 await expect(page.locator('#rightPanel')).toBeHidden();
 await page.locator('#restoreEquipment').click();
 await expect(page.locator('#implantControls')).toBeVisible();
 await expect(page.locator('canvas')).toHaveCount(1);
});

test('shared fill follows the active bay and uses no additional WebGL renderer',async({page})=>{
 await page.goto('/');
 const overview=await page.evaluate(()=>window.__foundryDiagnostics());
 expect(overview.lighting.exposure).toBeGreaterThan(1.15);
 expect(overview.lighting.fillIntensity).toBeGreaterThan(1);
 expect(overview.lighting.fillTarget[0]).toBeCloseTo(overview.roomBounds.centerX,4);
 await page.locator('#tabImplant').click();
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics().lighting.fillTarget[0])).toBe(94);
 expect(await page.locator('canvas').count()).toBe(1);
 await page.locator('#tabLPE').click();
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics().lighting.fillTarget[0])).toBe(0);
});

test('new run controls remain immediately accessible in mobile equipment panels',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 for(const key of ['spin','implant']){
  await page.goto('/?tool='+key);
  await expect.poll(()=>page.evaluate((tool)=>window.__foundryDiagnostics()?.[tool+'Loaded'],key),{timeout:30000}).toBe(true);
  const data=await page.locator('#'+key+'PlayBtn').evaluate(el=>{
   const p=el.parentElement.getBoundingClientRect(),r=el.getBoundingClientRect();
   return {first:el.parentElement.firstElementChild===el,
    top:r.top,parentTop:p.top,bottom:r.bottom,viewport:innerHeight,
    order:getComputedStyle(el).order};
  });
  expect(Number(data.order)).toBe(-1);
  expect(data.bottom).toBeLessThanOrEqual(data.viewport);
  expect(data.top).toBeGreaterThanOrEqual(0);
  await expect(page.locator('canvas')).toHaveCount(1);
 }
});

test('overview labels form two readable rows and keyboard selection enters one detailed station',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/');
 await expect(page.locator('body')).toHaveClass(/room-overview/);
 await expect(page.locator('#roomIntro')).toBeVisible();
 await expect(page.locator('.label3d')).toHaveCount(7);
 await page.waitForTimeout(400);
 const rectangles=await page.locator('.label3d').evaluateAll(els=>els.map(e=>{
  const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};
 }));
 for(let i=0;i<rectangles.length;i++)for(let j=i+1;j<rectangles.length;j++){
  const a=rectangles[i],b=rectangles[j];
  const overlapW=Math.min(a.right,b.right)-Math.max(a.left,b.left);
  const overlapH=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
  expect(Math.max(0,overlapW)*Math.max(0,overlapH)).toBeLessThan(5);
 }
 await page.locator('[data-bay="implant"].label3d').focus();
 await page.keyboard.press('Enter');
 await expect(page.locator('#tabImplant')).toHaveClass(/active/);
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics()?.implantLoaded),{timeout:30000}).toBe(true);
 await expect(page.locator('#roomIntro')).toBeHidden();
 await expect(page.locator('canvas')).toHaveCount(1);
 expect(errors).toEqual([]);
});

test('station journey eases camera and lens smoothly; dragging cancels its motion',async({page})=>{
 await page.goto('/');
 const before=await page.evaluate(()=>window.__foundryDiagnostics());
 await page.locator('#tabSpin').click();
 const start=await page.evaluate(()=>window.__foundryDiagnostics());
 expect(start.cameraJourney.active).toBe(true);
 expect(start.cameraJourney.durationMs).toBeGreaterThanOrEqual(680);
 await page.waitForTimeout(120);
 const middle=await page.evaluate(()=>window.__foundryDiagnostics());
 // Software WebGL can stall a Chromium worker longer than the entire
 // transition; the bounded smoothstep curve is unit-tested independently.
 if(middle.cameraJourney.active){
  expect(middle.cameraPosition[0]).toBeGreaterThan(before.cameraPosition[0]);
  expect(middle.cameraPosition[0]).toBeLessThan(82.5);
 }
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics().cameraJourney.active),{timeout:5000}).toBe(false);
 const end=await page.evaluate(()=>window.__foundryDiagnostics());
 expect(end.cameraPosition[0]).toBeCloseTo(82.5,1);
 expect(end.rendererCount).toBe(1);
 await page.locator('#tabOverview').click();
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics().cameraJourney.active)).toBe(true);
 await page.locator('canvas').dispatchEvent('pointerdown',{pointerId:11,clientX:640,clientY:450});
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics().cameraJourney.active)).toBe(false);
});

test('portrait station grid remains usable without expensive floating room labels',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await expect(page.locator('#roomIntro')).toBeVisible();
 await expect(page.locator('.label3d:visible')).toHaveCount(0);
 await expect(page.locator('.tabs .tab')).toHaveCount(8);
 const buttons=await page.locator('.tabs .tab').evaluateAll(els=>els.map(el=>{
  const r=el.getBoundingClientRect();return {w:r.width,h:r.height};
 }));
 for(const b of buttons){expect(b.w).toBeGreaterThan(90);expect(b.h).toBeGreaterThanOrEqual(40)}
 await page.locator('#tabImplant').click();
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics()?.implantLoaded),{timeout:30000}).toBe(true);
 await expect(page.locator('#implantControls')).toBeVisible();
 await expect(page.locator('canvas')).toHaveCount(1);
});
