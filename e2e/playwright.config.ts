import fs from 'node:fs';
import path from 'node:path';
import { chromium, defineConfig, devices } from '@playwright/test';

function resolveBrowserUse() {
  try {
    const bundled = chromium.executablePath();
    if (bundled && fs.existsSync(bundled)) {
      return { ...devices['Desktop Chrome'] };
    }
  } catch {
    // Fall back to system browser channel if bundled Chromium is unavailable.
  }

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  if (fs.existsSync(edgePath)) {
    return { ...devices['Desktop Edge'], channel: 'msedge' };
  }

  return { ...devices['Desktop Chrome'], channel: 'chrome' };
}

const backendRoot = path.resolve(__dirname, '../backend');
const backendVenvPackages = path.join(backendRoot, '.venv', 'Lib', 'site-packages');
const pythonExe = 'C:\\Program Files\\Python311\\python.exe';

export default defineConfig({
  testDir: './tests',
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
  timeout: 180_000,
  expect: {
    timeout: 20_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:15173',
    actionTimeout: 15_000,
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: resolveBrowserUse(),
    },
  ],
  webServer: [
    {
      command: `"${pythonExe}" -m uvicorn app.main:app --host 127.0.0.1 --port 18000`,
      cwd: backendRoot,
      url: 'http://127.0.0.1:18000/health',
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        PYTHONPATH: `${backendVenvPackages};${backendRoot}`,
        PYTHONNOUSERSITE: '1',
        SKIP_DOTENV: '1',
        DATABASE_URL: 'sqlite+aiosqlite:///./e2e_runtime.db',
        REDIS_URL: 'memory://',
        SEED_DEFAULT_ADMIN: 'true',
        DEBUG_MODE: 'true',
        HARDWARE_TOKEN: 'e2e-hw-token',
        PIN_PEPPER: 'e2e-pepper',
        JWT_SECRET_KEY: 'e2e-jwt-secret-key-at-least-32-chars',
        CORS_ORIGINS: 'http://127.0.0.1:15173',
        FRONTEND_URL: 'http://127.0.0.1:15173',
      },
    },
    {
      command: 'node serve-stack.mjs',
      cwd: __dirname,
      url: 'http://127.0.0.1:15173/__serve_health',
      reuseExistingServer: false,
      timeout: 15_000,
      env: {
        PORT: '15173',
        BACKEND_HOST: '127.0.0.1',
        BACKEND_PORT: '18000',
      },
    },
  ],
});
