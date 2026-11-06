import {test,expect} from '@playwright/test';

test('room overview equipment can be selected with real mouse input',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/');
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics?.()?.view)).toBe('overview');

 // Pick a visible instrument from projected label anchors, not a hard-coded
 // screen pixel. The overview camera/framing and CI software renderer vary.
 // Avoid UI overlays and confirm the real canvas raycast reports the bay.
 const anchors=await page.locator('.label3d[data-bay]').evaluateAll(nodes=>
  Object.fromEntries(nodes.map(el=>{
   const rect=el.getBoundingClientRect();
   return [el.dataset.bay,{x:rect.left+rect.width/2,bottom:rect.bottom}];
  }))
 );
 const tabs={cmp:'tabCMP',mbe:'tabMBE',imm:'tabIMM',litho:'tabLitho',
  lpe:'tabLPE',spin:'tabSpin',implant:'tabImplant'};
 let found=null;
 for(const bay of ['cmp','mbe','imm','litho','lpe','spin','implant']){
  const anchor=anchors[bay];
  if(!anchor)continue;
  for(const offset of [24,48,72,104,144,184]){
   const x=Math.round(anchor.x),y=Math.round(anchor.bottom+offset);
   const available=await page.evaluate(({x,y})=>{
    const top=document.elementFromPoint(x,y);
    return top?.tagName==='CANVAS';
   },{x,y});
   if(!available)continue;
   // Overview hover picking is deliberately throttled to 12 Hz.
   await page.waitForTimeout(95);
   await page.mouse.move(x,y);
   const hovered=await page.evaluate(()=>window.__foundryDiagnostics()?.hoveredBay);
   if(hovered===bay){found={bay,x,y};break;}
  }
  if(found)break;
 }
 expect(found,'an unobstructed room machine/bay should be pickable').toBeTruthy();
 await page.mouse.click(found.x,found.y);
 await expect(page.locator('#'+tabs[found.bay])).toHaveClass(/active/);
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics().view)).toBe(found.bay);
 await expect(page.locator('canvas')).toHaveCount(1);
 expect(errors).toEqual([]);
});
