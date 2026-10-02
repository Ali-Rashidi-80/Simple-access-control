import { test, expect } from '@playwright/test';

test.describe('Critical User Flow', () => {

    test('should login and create a user via UI', async ({ page }) => {
        // Listen to browser logs
        page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));

        try {
            console.log('Step 1: Navigating to / (Root)');
            await page.goto('/', { waitUntil: 'domcontentloaded' });

            // 1. Wait for Loading Spinner to disappear
            console.log('Step 1.5: Waiting for App to Load (Spinner)');
            const spinner = page.locator('.animate-spin');
            await expect(spinner).not.toBeVisible({ timeout: 15000 });

            // 2. Check State: Login vs Dashboard
            // If Sidebar is visible -> Logged In
            // If Login Input visible -> Login Required
            const sidebar = page.locator('nav').first(); // Sidebar usually has nav
            const loginInput = page.getByPlaceholder(/Username|نام کاربری/i);

            if (await loginInput.isVisible()) {
                console.log('Step 2: Login Form Detected. Logging in...');
                await loginInput.fill('admin');
                await page.getByPlaceholder(/Password|رمز عبور/i).fill('admin123');
                await page.getByRole('button', { name: 'ورود', exact: true }).click();

                console.log('Step 2.5: Waiting for Dashboard');
                // Strict check: must be dashboard. The app redirects to /dashboard after login.
                await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
            } else {
                console.log('Step 2: No Login Form. Assuming Logged In (Sidebar check).');
                // Optional: Verify Sidebar
                // await expect(sidebar).toBeVisible(); 
                // But checking URL is handled next
            }

            console.log('Step 3: Navigating to /users via Sidebar');
            // Navigate via Sidebar (SPA navigation) to preserve session state
            // Sidebar is usually <nav> with buttons. 'Users' is generally the 3rd item (Home, Logs, Users).
            // We try logical name first, then fallback to index if localization is tricky.
            const usersTab = page.locator('nav').getByRole('button').nth(2);
            await expect(usersTab).toBeVisible();
            await usersTab.click();

            // Wait for Users page header to confirm navigation
            await expect(page.getByRole('heading', { name: /Authorized Users|کاربران مجاز/i })).toBeVisible({ timeout: 10000 });

            console.log('Step 4: Clicking Add User');
            // Use structural selector to avoid Persian regex encoding issues
            // The "Add User" button is the main action button in the header region of <main>
            const addButton = page.locator('main button').first();
            // Alternatively: page.locator('button:has(svg)') inside main

            await expect(addButton).toBeVisible({ timeout: 10000 });
            await addButton.click();

            console.log('Step 5: Checking Modal');
            // Wait for Modal to open (empty RFID)
            await expect(page.getByText(/RFID Tag|شناسه/i)).toBeVisible({ timeout: 5000 });

            console.log('Step 6: Simulating Scan via API');
            // Trigger backend simulation
            const res = await page.request.post('http://127.0.0.1:8000/api/debug/simulate-scan', {
                data: { type: "scan", rfid: "123456", temperature: 25.5, is_duress: false }
            });
            expect(res.ok()).toBeTruthy();

            console.log('Step 7: Verify RFID injection');
            // Wait for WS propagation and UI update
            await expect(page.getByText('123456')).toBeVisible({ timeout: 5000 });

            console.log('Step 8: Fill and Save');
            await page.getByPlaceholder(/enter name|نام را وارد کنید/i).fill('E2E Test User');

            // Structural selector for Save button (Language Agnostic)
            const saveButton = page.locator('button:has(svg.lucide-save)');
            await expect(saveButton).toBeVisible();
            await expect(saveButton).toBeEnabled({ timeout: 5000 });
            await saveButton.click();

            console.log('Step 9: Verify Success');
            await expect(page.getByText(/User Registered|کاربر با موفقیت/i)).toBeVisible();

            console.log('Flow Success!');

        } catch (e) {
            console.error('Test Failed:', e);
            try {
                const bodyText = await page.locator('body').innerText();
                console.log('PAGE BODY TEXT ON FAILURE:', bodyText);
            } catch (inner) { }
            throw e;
        }
    });
});
