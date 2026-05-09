import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.VERCEL_PREVIEW_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,

  reporter: [
    ["list"],
    ["json", { outputFile: "playwright-report/results.json" }],
    ["html", { outputDir: "playwright-report", open: "never" }],
  ],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
      testMatch: "**/clinical-safety.spec.ts",
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 12"] },
      testMatch: "**/mobile-ux.spec.ts",
    },
  ],
});
