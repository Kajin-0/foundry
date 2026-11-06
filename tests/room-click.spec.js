import {test,expect} from '@playwright/test';
test('room overview machine silhouette can be selected with a real mouse click',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/');
 await page.waitForTimeout(240);
 await page.mouse.move(1260,477);
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics()?.hoveredBay),{timeout:3000}).toBe('implant');
 await page.mouse.click(1260,477);
 await expect(page.locator('#tabImplant')).toHaveClass(/active/);
 await expect.poll(()=>page.evaluate(()=>window.__foundryDiagnostics()?.implantLoaded),{timeout:30000}).toBe(true);
 await expect(page.locator('canvas')).toHaveCount(1);
});
