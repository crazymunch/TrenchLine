import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests (Phase 3.7).
 *
 * Three viewports, all real targets rather than a desktop run with a phone
 * afterthought: 375x667 is the phone the app is used on at a table, 768x1024
 * the tablet that is the other common table device (docs/MOBILE.md), and
 * 1440x900 the desktop where most roster building actually happens.
 *
 * The desktop is a separate project rather than an assumed baseline because
 * it is the only one of the three that shows the sidebar rail, and the only
 * one where the touch-target and 16px-input floors deliberately do NOT apply
 * — those rules stop at 1024px. What it shares with the other two is that the
 * page must never scroll sideways and no view may throw.
 *
 * Everything runs against a **production build**. The bugs these tests exist to
 * catch are production bugs — Tailwind tree-shaking a rule out of the compiled
 * stylesheet, a layout that only overflows once real data has loaded — and none
 * of them reproduce under `next dev`.
 */
const PORT = 3210;

export default defineConfig({
  testDir: './e2e',
  // These assert layout and data, not timing; a retry would only hide a flake
  // that is really a bug.
  retries: 0,
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    /*
      An escape hatch for a machine that already has Chromium but not the exact
      build this Playwright pins — a sandbox or a container image with one
      preinstalled. Unset (the normal case, and CI) Playwright finds its own.
      Never `playwright install` past a mismatch: that downloads a second
      browser to sit beside the one already there.
    */
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : undefined,
  },
  projects: [
    /*
      Chromium for both, deliberately.

      `devices['iPhone SE']` selects WebKit, and these assertions are about
      layout, CSS and data rather than about engine differences — the phone
      metrics that matter here are the viewport, the touch flag and the device
      scale factor, all of which the preset still provides. Pinning the engine
      also keeps CI to one browser download instead of three.
    */
    {
      name: 'phone',
      use: { ...devices['iPhone SE'], browserName: 'chromium',
             viewport: { width: 375, height: 667 } },
    },
    {
      name: 'tablet',
      use: { ...devices['iPad Mini'], browserName: 'chromium',
             viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'],
             viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    /*
      `reuseExistingServer` is a real trap locally, and it fails in a way that
      looks like a product bug rather than a stale process: `next start` holds
      the prerendered HTML and the build manifest in memory, so a server left
      running across a rebuild keeps serving HTML that names chunks the new
      `.next` no longer contains. Those 400, React never hydrates, and every
      button on the page is inert — which reads as "the sheet does not open".

      So after `next build`, kill the old server before running these. CI is
      unaffected: it starts fresh.
    */
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NODE_ENV: 'production',
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://user:pass@localhost:5432/db',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? 'e2e-placeholder',
    },
  },
});
