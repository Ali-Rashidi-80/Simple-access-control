import { expect, test } from '@playwright/test';

const ORIGIN = 'http://127.0.0.1:15173';

test.describe('SentryGate Door E2E Flow', () => {
  test('full door access admin journey across login, WS scan, users, temp pins, operators, logs, settings, profile, and logout', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    // 1. Unauthenticated / -> /login; theme + FA/EN RTL/LTR switches; wrong password; valid login
    await page.goto('/');
    await expect(page).toHaveURL(/\/login\/?$/);

    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'neon');
    await expect(html).toHaveAttribute('dir', 'rtl');

    const themeToggle = page.getByRole('button', { name: /تغییر تم|Switch theme/i });
    await themeToggle.click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await themeToggle.click();
    await expect(html).toHaveAttribute('data-theme', 'neon');

    const langSelect = page.getByLabel(/زبان|Language/i);
    await langSelect.selectOption('en');
    await expect(html).toHaveAttribute('dir', 'ltr');
    await expect(html).toHaveAttribute('lang', 'en');
    await langSelect.selectOption('fa');
    await expect(html).toHaveAttribute('dir', 'rtl');
    await expect(html).toHaveAttribute('lang', 'fa');

    const usernameInput = page.locator('input[autocomplete="username"]');
    const passwordInput = page.locator('input[autocomplete="current-password"]');
    const submitLogin = page.getByRole('button', { name: /^(ورود|Login)$/ });

    await usernameInput.fill('admin');
    await passwordInput.fill('wrong-password-123');
    await submitLogin.click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login\/?$/);

    await usernameInput.fill('admin');
    await passwordInput.fill('admin123');
    await submitLogin.click();
    await expect(page).toHaveURL(/\/dashboard\/?$/);

    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name === 'sg_access' && c.value.length > 10)).toBeTruthy();

    // 2. Real-time WS UNKNOWN_TAG via simulate-scan -> /users prefilled -> create w/ PIN 4826 -> edit via <dialog>
    await expect(page.getByText(/وب‌سوکت:\s*متصل|WebSocket:\s*Connected/)).toBeVisible();

    const scanResponse = await page.request.post('/api/debug/simulate-scan', {
      headers: { Origin: ORIGIN },
      data: { type: 'scan', rfid: 'E2E998877', temperature: 24.5, is_duress: false },
    });
    expect(scanResponse.ok()).toBeTruthy();

    await expect(
      page.getByText(/تگ RFID ناشناس شناسایی شد|Unknown RFID tag detected/),
    ).toBeVisible();
    await expect(page.getByText('E2E998877').first()).toBeVisible();

    await page.getByRole('link', { name: /ثبت کاربر با این تگ|Register user/ }).click();
    await expect(page).toHaveURL(/\/users\/?\?register=true&rfid=E2E998877/);

    const userCreateForm = page.locator('main form');
    await expect(userCreateForm.getByLabel(/تگ RFID|RFID Tag/)).toHaveValue('E2E998877');
    await userCreateForm.getByLabel(/نام و نام خانوادگی|Full Name/).fill('E2E User One');
    await userCreateForm.getByLabel(/PIN/i).fill('4826');
    await userCreateForm.locator('button.btn-primary').click();

    await expect(page.getByText('E2E User One')).toBeVisible();
    await expect(page.getByText(/پین دارد|PIN set/)).toBeVisible();

    await page.getByRole('button', { name: /ویرایش کاربر|Edit User/ }).first().click();
    const openDialog = page.locator('dialog[open]');
    await expect(openDialog).toBeVisible();
    await openDialog.getByLabel(/نام و نام خانوادگی|Full Name/).fill('E2E User Edited');
    await openDialog.locator('button[type="submit"]').click();
    await expect(openDialog).toBeHidden();
    await expect(page.getByText('E2E User Edited')).toBeVisible();

    // 3. /temporary-pins: create temp PIN (send_sms off) -> one-time PIN card -> revoke via <dialog>
    await page.locator('aside nav a[href*="/temporary-pins"]').click();
    await expect(page).toHaveURL(/\/temporary-pins\/?$/);

    const tempPinForm = page.locator('main form');
    await tempPinForm.getByLabel(/عنوان|Label/).fill('E2E Guest PIN');
    const sendSmsCheckbox = tempPinForm.getByLabel(/ارسال پیامک|Send SMS/);
    await expect(sendSmsCheckbox).toBeChecked();
    await sendSmsCheckbox.uncheck();
    await tempPinForm.locator('button.btn-primary').click();

    await expect(
      page.getByText(/PIN موقت — فقط یک‌بار نمایش داده می‌شود|Temporary PIN — shown only once/),
    ).toBeVisible();
    await expect(page.getByText(/بدون پیامک|No SMS/)).toBeVisible();
    await expect(page.getByText('E2E Guest PIN')).toBeVisible();

    await page
      .getByRole('button', { name: /لغو پین موقت|Revoke Temporary PIN/ })
      .first()
      .click();
    await expect(openDialog).toBeVisible();
    await openDialog.locator('button.btn-danger').click();
    await expect(openDialog).toBeHidden();
    await expect(page.getByText(/استفاده باقی‌مانده:\s*0|Uses remaining:\s*0/)).toBeVisible();

    // 4. /operators: create operator -> edit operator via <dialog>
    await page.locator('aside nav a[href*="/operators"]').click();
    await expect(page).toHaveURL(/\/operators\/?$/);

    const operatorForm = page.locator('main form');
    await operatorForm.getByLabel(/نام کاربری|Username/).fill('e2e_op');
    await operatorForm.getByLabel(/رمز عبور|Password/).fill('opSecret123');
    await operatorForm.getByLabel(/نام و نام خانوادگی|Full Name/).fill('E2E Operator');
    await operatorForm.locator('button.btn-primary').click();

    await expect(page.getByText('@e2e_op')).toBeVisible();
    await expect(page.getByText('E2E Operator')).toBeVisible();

    const opCard = page.locator('main .surface-muted', { hasText: '@e2e_op' }).first();
    await opCard.getByRole('button', { name: /ویرایش اپراتور|Edit Operator/ }).click();
    await expect(openDialog).toBeVisible();
    await openDialog.getByLabel(/نام و نام خانوادگی|Full Name/).fill('E2E Operator Renamed');
    await openDialog.locator('button[type="submit"]').click();
    await expect(openDialog).toBeHidden();
    await expect(page.getByText('E2E Operator Renamed')).toBeVisible();

    // 5. /logs: filter logs & verify /logs/export CSV response (200, text/csv)
    await page.locator('aside nav a[href*="/logs"]').click();
    await expect(page).toHaveURL(/\/logs\/?$/);

    await expect(page.locator('table')).toContainText('E2E998877');
    await page.getByPlaceholder(/جستجوی نام یا RFID|Search name or RFID/i).fill('E2E998877');
    await page.locator('main form button[type="submit"]').click();
    await expect(page.locator('table')).toContainText('E2E998877');

    // Verify export via direct API call (browser download blob makes body inaccessible via waitForResponse)
    const exportApiResponse = await page.request.get('/logs/export?q=E2E998877');
    expect(exportApiResponse.status()).toBe(200);
    expect(exportApiResponse.headers()['content-type'] || '').toContain('text/csv');
    const csvBody = await exportApiResponse.text();
    expect(csvBody).toContain('E2E998877');
    // Also click the export button to verify it doesn't error
    await page.getByRole('button', { name: /خروجی CSV|Export CSV/ }).click();

    // 6. /settings & /profile: save settings (alert_phone, theme) -> update profile full_name -> logout -> /login
    await page.locator('aside nav a[href*="/settings"]').click();
    await expect(page).toHaveURL(/\/settings\/?$/);

    const alertPhoneInput = page.getByLabel(/شماره هشدار اضطرار|Emergency Alert Phone/i);
    await expect(alertPhoneInput).toBeVisible();
    await alertPhoneInput.fill('09123334455');
    await page.getByRole('combobox', { name: /^(تم|Theme)$/i }).selectOption('matrix');
    await expect(html).toHaveAttribute('data-theme', 'matrix');

    await page.locator('main form button.btn-primary').click();
    await expect(page.locator('main [role="status"]')).toContainText(
      /تنظیمات ذخیره شد|Settings saved successfully/,
    );

    await page.reload();
    await expect(page.getByLabel(/شماره هشدار اضطرار|Emergency Alert Phone/i)).toHaveValue(
      '09123334455',
    );
    await expect(html).toHaveAttribute('data-theme', 'matrix');

    await page.locator('aside nav a[href*="/profile"]').click();
    await expect(page).toHaveURL(/\/profile\/?$/);

    const profileForm = page.locator('main form');
    await profileForm.getByLabel(/نام و نام خانوادگی|Full Name/).fill('System Admin E2E');
    await profileForm.locator('button.btn-primary').click();
    await expect(page.locator('main [role="status"]')).toContainText(
      /پروفایل با موفقیت به‌روزرسانی شد|Profile updated/,
    );
    await expect(page.getByRole('heading', { name: 'System Admin E2E' })).toBeVisible();

    await page.locator('aside').getByRole('button', { name: /خروج|Logout/ }).click();
    await expect(page).toHaveURL(/\/login\/?$/);

    expect(pageErrors).toEqual([]);
  });
});
