import { defineConfig, devices } from 'playwright';

export default defineConfig({
  testDir: './documents/gherkin',
  testMatch: '**/*.spec.js',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  retries: 0,
  workers: 1,

  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'documents/reports/test-report.json' }],
    ['junit', { outputFile: 'documents/reports/test-report.xml' }],
  ],

  use: {
    baseURL: process.env.APP_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        headless: process.env.HEADLESS !== 'false',
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        headless: process.env.HEADLESS !== 'false',
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        headless: process.env.HEADLESS !== 'false',
      },
    },
  ],
});
