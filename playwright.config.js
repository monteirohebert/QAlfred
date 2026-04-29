// playwright.config.js - Optional advanced configuration
// This is an example configuration file for Playwright

export default {
  // Test directory
  testDir: './tests',
  
  // Test file pattern
  testMatch: '**/*.spec.js',
  
  // Timeout for each test
  timeout: 30000,
  
  // Timeout for expect assertions
  expect: {
    timeout: 5000
  },
  
  // Retry failed tests
  retries: 0,
  
  // Number of workers for parallel testing
  workers: 1,
  
  // Reporter
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'reports/test-report.json' }],
    ['junit', { outputFile: 'reports/test-report.xml' }]
  ],
  
  // Use configuration
  use: {
    // Browser context options
    baseURL: process.env.APP_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  
  // Projects
  projects: [
    {
      name: 'chromium',
      use: { 
        ...require('@playwright/test').devices['Desktop Chrome'],
        headless: process.env.HEADLESS !== 'false'
      },
    },
    {
      name: 'firefox',
      use: { 
        ...require('@playwright/test').devices['Desktop Firefox'],
        headless: process.env.HEADLESS !== 'false'
      },
    },
    {
      name: 'webkit',
      use: { 
        ...require('@playwright/test').devices['Desktop Safari'],
        headless: process.env.HEADLESS !== 'false'
      },
    },
  ],
};
