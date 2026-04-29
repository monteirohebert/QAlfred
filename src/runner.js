import fs from 'fs';
import path from 'path';
import { chromium, firefox, webkit } from 'playwright';
import { parse } from '@cucumber/gherkin';
import { dialects } from '@cucumber/gherkin';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
  baseURL: process.env.APP_BASE_URL || 'http://localhost:3000',
  browser: process.env.BROWSER || 'chromium',
  headless: process.env.HEADLESS !== 'false',
  timeout: parseInt(process.env.TIMEOUT || '30000'),
  slowMo: parseInt(process.env.SLOW_MO || '0'),
  screenshotDir: './screenshots',
};

// Parse command line arguments
const args = process.argv.slice(2);
const feature = args[0] || null;
const tag = args.find(arg => arg.startsWith('--tag='))?.split('=')[1] || null;
const runAll = args.includes('--all');

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n🚀 QAlfred - E2E Test Runner');
  console.log('═'.repeat(50));
  
  const gherkinDir = './documentos/gherkin';
  
  // Collect feature files
  let featureFiles = fs.readdirSync(gherkinDir)
    .filter(file => file.endsWith('.feature'))
    .map(file => path.join(gherkinDir, file));

  // Filter by feature name if specified
  if (feature && !runAll) {
    featureFiles = featureFiles.filter(f => f.includes(feature));
  }

  if (featureFiles.length === 0) {
    console.error(`✗ No feature files found${feature ? ` matching "${feature}"` : ''}`);
    process.exit(1);
  }

  console.log(`📋 Found ${featureFiles.length} feature file(s)\n`);

  let browser;
  let totalStats = { passed: 0, failed: 0, blocked: 0 };

  try {
    // Launch browser
    browser = await launchBrowser(config.browser);
    console.log(`✅ Browser launched: ${config.browser}\n`);

    // Execute each feature file
    for (const featureFile of featureFiles) {
      const featureName = path.basename(featureFile, '.feature');
      await executeFeature(browser, featureFile, featureName, tag, totalStats);
    }

    // Print summary
    printTestSummary(totalStats);

  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n✅ Browser closed');
    }
  }
}

/**
 * Launch browser based on config
 */
async function launchBrowser(browserName) {
  const options = {
    headless: config.headless,
    slowMo: config.slowMo,
  };

  switch (browserName.toLowerCase()) {
    case 'firefox':
      return await firefox.launch(options);
    case 'webkit':
      return await webkit.launch(options);
    default:
      return await chromium.launch(options);
  }
}

/**
 * Execute a single feature file
 */
async function executeFeature(browser, featureFile, featureName, tagFilter, stats) {
  const content = fs.readFileSync(featureFile, 'utf-8');
  const gherkinDocument = parse(content);
  const page = await browser.newPage();

  console.log(`\n📄 Feature: ${featureName}`);
  console.log('─'.repeat(50));

  let scenariosPassed = 0;
  let scenariosFailed = 0;
  let scenariosBlocked = 0;

  try {
    for (const child of gherkinDocument.feature.children) {
      if (child.scenario) {
        const scenario = child.scenario;
        
        // Check if scenario has requested tag
        if (tagFilter) {
          const scenarioTags = scenario.tags?.map(t => t.name) || [];
          if (!scenarioTags.includes(`@${tagFilter}`)) {
            continue;
          }
        }

        const result = await executeScenario(page, scenario, featureName);
        
        if (result === 'passed') {
          scenariosPassed++;
          stats.passed++;
          console.log(`  ✅ ${scenario.name}`);
        } else if (result === 'failed') {
          scenariosFailed++;
          stats.failed++;
          console.log(`  ❌ ${scenario.name}`);
        } else if (result === 'blocked') {
          scenariosBlocked++;
          stats.blocked++;
          console.log(`  ⚠️  ${scenario.name} (Blocked)`);
        }
      }
    }
  } catch (error) {
    console.error(`  ❌ Feature execution error: ${error.message}`);
  } finally {
    await page.close();
  }

  console.log(`\nResults: ${scenariosPassed} ✅ | ${scenariosFailed} ❌ | ${scenariosBlocked} ⚠️`);
}

/**
 * Execute a single scenario
 */
async function executeScenario(page, scenario, featureName) {
  let status = 'passed';

  for (const step of scenario.steps) {
    const stepText = step.text;
    const keyword = step.keyword.trim();

    try {
      await executeStep(page, keyword, stepText, featureName, scenario.name);
      
      // Capture screenshot on success
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = path.join(
        config.screenshotDir,
        `${featureName}-${scenario.name.replace(/\s+/g, '_')}-${timestamp}.png`
      );
      
      if (process.env.SCREENSHOT_ON_SUCCESS === 'true') {
        await page.screenshot({ path: screenshotPath });
      }

    } catch (error) {
      status = 'failed';
      console.error(`    ❌ Step failed: ${stepText}`);
      console.error(`    Error: ${error.message}`);

      // Capture screenshot on failure
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = path.join(
        config.screenshotDir,
        `${featureName}-${scenario.name.replace(/\s+/g, '_')}-FAILED-${timestamp}.png`
      );

      if (process.env.SCREENSHOT_ON_FAILURE !== 'false') {
        try {
          await page.screenshot({ path: screenshotPath });
        } catch (screenshotError) {
          console.error(`    Could not capture screenshot: ${screenshotError.message}`);
        }
      }

      break; // Stop executing remaining steps in this scenario
    }
  }

  return status;
}

/**
 * Execute a single step
 */
async function executeStep(page, keyword, stepText, feature, scenario) {
  // Example implementations for common Gherkin keywords
  
  if (keyword === 'Given') {
    if (stepText.includes('page is loaded')) {
      await page.goto(config.baseURL);
      await page.waitForLoadState('networkidle');
    } else if (stepText.includes('user is not authenticated')) {
      await page.context().clearCookies();
    }
  } 
  
  else if (keyword === 'When') {
    if (stepText.includes('clicks on')) {
      const elementName = extractElementName(stepText);
      await page.click(`text=${elementName}`);
    } else if (stepText.includes('enters')) {
      const parts = stepText.match(/enters (.+) in (.+)/);
      if (parts) {
        const value = parts[1];
        const fieldName = parts[2];
        const selector = `input[placeholder*="${fieldName}"], input[name*="${fieldName}"]`;
        await page.fill(selector, value);
      }
    } else if (stepText.includes('submits')) {
      await page.click('button[type="submit"], button:has-text("Submit")');
    }
  } 
  
  else if (keyword === 'Then') {
    if (stepText.includes('should see')) {
      const text = extractElementName(stepText);
      await page.waitForSelector(`text=${text}`);
      const isVisible = await page.isVisible(`text=${text}`);
      if (!isVisible) throw new Error(`Element "${text}" not visible`);
    } else if (stepText.includes('should not see')) {
      const text = extractElementName(stepText);
      const isVisible = await page.isVisible(`text=${text}`).catch(() => false);
      if (isVisible) throw new Error(`Element "${text}" is visible but should not be`);
    } else if (stepText.includes('URL should be')) {
      const expectedUrl = stepText.match(/URL should be (.+)/)[1];
      const currentUrl = page.url();
      if (!currentUrl.includes(expectedUrl)) {
        throw new Error(`Expected URL to include "${expectedUrl}", but got "${currentUrl}"`);
      }
    }
  } 
  
  else if (keyword === 'And') {
    // And steps are treated as their preceding type (Given/When/Then)
    await executeStep(page, 'When', stepText, feature, scenario);
  }
}

/**
 * Helper: Extract element name from step text
 */
function extractElementName(stepText) {
  const matches = stepText.match(/'([^']+)'/) || stepText.match(/"([^"]+)"/);
  return matches ? matches[1] : stepText.split(/on|in|at/)[1]?.trim() || stepText;
}

/**
 * Print test summary
 */
function printTestSummary(stats) {
  const total = stats.passed + stats.failed + stats.blocked;
  const passRate = total > 0 ? ((stats.passed / total) * 100).toFixed(1) : 0;

  console.log('\n' + '═'.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(50));
  console.log(`Total Tests:  ${total}`);
  console.log(`✅ Passed:     ${stats.passed}`);
  console.log(`❌ Failed:     ${stats.failed}`);
  console.log(`⚠️  Blocked:    ${stats.blocked}`);
  console.log(`📈 Pass Rate:  ${passRate}%`);
  console.log('═'.repeat(50) + '\n');

  if (stats.failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
