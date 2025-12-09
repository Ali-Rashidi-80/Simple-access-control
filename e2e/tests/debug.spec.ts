import { test, expect } from '@playwright/test';

test('debug connectivity', async ({ page }) => {
    console.log('Navigating to root...');
    const response = await page.goto('/', { timeout: 30000 });
    console.log(`Status: ${response?.status()}`);
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'debug_screenshot.png' });
    const content = await page.content();
    console.log(`Content length: ${content.length}`);
    expect(response?.status()).toBe(200);
});
