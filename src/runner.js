import fs from 'fs';
import path from 'path';
import { chromium, firefox, webkit } from 'playwright';
import pkg from '@cucumber/gherkin';
import { generateReport } from './reporter.js';
const { Parser, AstBuilder, GherkinClassicTokenMatcher } = pkg;

function parse(content) {
  const builder = new AstBuilder(() => Math.random().toString(36).slice(2));
  const matcher = new GherkinClassicTokenMatcher('pt');
  const parser = new Parser(builder, matcher);
  return parser.parse(content);
}
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
  baseURL: process.env.APP_BASE_URL || 'http://localhost:3000',
  browser: process.env.BROWSER || 'chromium',
  headless: process.env.HEADLESS !== 'false',
  timeout: parseInt(process.env.TIMEOUT || '30000'),
  slowMo: parseInt(process.env.SLOW_MO || '0'),
  screenshotDir: './documents/screenshots',
};

// Parse command line arguments
const args = process.argv.slice(2);
const feature = args[0] || null;
const tag = args.find(arg => arg.startsWith('--tag='))?.split('=')[1] || null;
const runAll = args.includes('--all');

/**
 * Recursively collect all .feature files under a directory
 */
function collectFeatureFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectFeatureFiles(full);
    if (entry.isFile() && entry.name.endsWith('.feature')) return [full];
    return [];
  });
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n🚀 QAlfred - E2E Test Runner');
  console.log('═'.repeat(50));
  
  const gherkinDir = './documents/gherkin';

  // Collect feature files recursively across app subfolders
  let featureFiles = collectFeatureFiles(gherkinDir);

  // Filter by feature name or app folder if specified
  if (feature && !runAll) {
    featureFiles = featureFiles.filter(f => f.includes(feature));
  }

  if (featureFiles.length === 0) {
    console.error(`✗ No feature files found${feature ? ` matching "${feature}"` : ''}`);
    process.exit(1);
  }

  console.log(`📋 Found ${featureFiles.length} feature file(s)\n`);

  const runTimestamp = new Date().toISOString()
    .replace('T', '_').replace(/[:.]/g, '-').slice(0, 19);

  let browser;
  let totalStats = { passed: 0, failed: 0, blocked: 0 };
  const runResults = { timestamp: runTimestamp, features: [], stats: totalStats };

  try {
    browser = await launchBrowser(config.browser);
    console.log(`✅ Browser launched: ${config.browser}\n`);

    for (const featureFile of featureFiles) {
      const featureName = path.basename(featureFile, '.feature');
      // App name = name of the subfolder inside gherkin/
      const appName = path.relative(gherkinDir, path.dirname(featureFile)).split(path.sep)[0] || 'general';
      const featureResult = { name: featureName, app: appName, scenarios: [] };
      runResults.features.push(featureResult);
      await executeFeature(browser, featureFile, featureName, tag, totalStats, featureResult, runTimestamp);
    }

    const exitCode = printTestSummary(totalStats);

    // Generate PDF report
    console.log('📄 Generating PDF report...');
    const pdfPath = await generateReport(browser, runResults, './documents/reports');
    console.log(`✅ Report saved: ${pdfPath}\n`);

    if (exitCode !== 0) process.exitCode = exitCode;

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
    case 'edge':
      return await chromium.launch({ ...options, channel: 'msedge' });
    default:
      return await chromium.launch({ ...options, channel: 'chrome' });
  }
}

/**
 * Execute a single feature file
 */
async function executeFeature(browser, featureFile, featureName, tagFilter, stats, featureResult, runTimestamp) {
  const content = fs.readFileSync(featureFile, 'utf-8');
  const gherkinDocument = parse(content);

  const appLabel = featureResult?.app ? ` [${featureResult.app}]` : '';
  console.log(`\n📄 Feature: ${featureName}${appLabel}`);
  console.log('─'.repeat(50));

  // Extract background steps
  const backgroundSteps = [];
  for (const child of gherkinDocument.feature.children) {
    if (child.background) {
      backgroundSteps.push(...child.background.steps);
    }
  }

  let scenariosPassed = 0;
  let scenariosFailed = 0;
  let scenariosBlocked = 0;

  try {
    for (const child of gherkinDocument.feature.children) {
      if (!child.scenario) continue;
      const scenario = child.scenario;

      if (tagFilter) {
        const scenarioTags = scenario.tags?.map(t => t.name) || [];
        if (!scenarioTags.includes(`@${tagFilter}`)) continue;
      }

      const page = await browser.newPage();
      const { status, steps, duration } = await executeScenario(page, scenario, featureName, backgroundSteps, runTimestamp);
      await page.close();

      featureResult.scenarios.push({ name: scenario.name, status, steps, duration });

      if (status === 'passed') {
        scenariosPassed++;
        stats.passed++;
        console.log(`  ✅ ${scenario.name}`);
      } else if (status === 'failed') {
        scenariosFailed++;
        stats.failed++;
        console.log(`  ❌ ${scenario.name}`);
      } else {
        scenariosBlocked++;
        stats.blocked++;
        console.log(`  ⚠️  ${scenario.name} (blocked)`);
      }
    }
  } catch (error) {
    console.error(`  ❌ Feature error: ${error.message}`);
  }

  console.log(`\nResults: ${scenariosPassed} passed | ${scenariosFailed} failed | ${scenariosBlocked} blocked`);
}

/**
 * Sanitize a string for use as a directory/file name
 */
function sanitizeName(name) {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9_\- ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 80);
}

/**
 * Execute a single scenario (background steps run first)
 */
async function executeScenario(page, scenario, featureName, backgroundSteps = [], runTimestamp) {
  let status = 'passed';
  const allSteps = [...backgroundSteps, ...scenario.steps];
  const stepResults = [];

  // screenshots/<run_timestamp>/<scenario>/
  const scenarioDir = path.join(
    config.screenshotDir,
    runTimestamp,
    sanitizeName(scenario.name)
  );
  fs.mkdirSync(scenarioDir, { recursive: true });

  const startTime = Date.now();
  let stepIndex = 0;

  for (const step of allSteps) {
    const stepText = step.text;
    const keyword = step.keyword.trim();
    stepIndex++;

    try {
      await executeStep(page, keyword, stepText, featureName, scenario.name);
      stepResults.push({ keyword, text: stepText, status: 'passed', error: null });

      if (process.env.SCREENSHOT_ON_SUCCESS === 'true') {
        const stepName = sanitizeName(`${String(stepIndex).padStart(2, '0')}_${keyword}_${stepText}`);
        await page.screenshot({ path: path.join(scenarioDir, `${stepName}.png`) });
      }

    } catch (error) {
      status = 'failed';
      stepResults.push({ keyword, text: stepText, status: 'failed', error: error.message });
      console.error(`    ❌ Step failed: "${stepText}"`);
      console.error(`       Error: ${error.message}`);

      if (process.env.SCREENSHOT_ON_FAILURE !== 'false') {
        try {
          const stepName = sanitizeName(`${String(stepIndex).padStart(2, '0')}_FAILED_${keyword}_${stepText}`);
          await page.screenshot({ path: path.join(scenarioDir, `${stepName}.png`) });
        } catch (screenshotError) {
          console.error(`       Could not capture screenshot: ${screenshotError.message}`);
        }
      }

      // Mark remaining steps as skipped
      for (const remaining of allSteps.slice(stepIndex)) {
        stepResults.push({ keyword: remaining.keyword.trim(), text: remaining.text, status: 'skipped', error: null });
      }
      break;
    }
  }

  const duration = Date.now() - startTime;
  console.log(`     📁 Folder: ${path.relative('.', scenarioDir)}`);
  return { status, steps: stepResults, duration };
}

/**
 * Resolve a value: if it matches an env var name, return its value; otherwise return as-is.
 */
function resolveEnvValue(value) {
  if (value && /^[A-Z][A-Z0-9_]+$/.test(value) && process.env[value] !== undefined) {
    return process.env[value];
  }
  return value;
}

/**
 * Execute a single step
 */
async function executeStep(page, keyword, stepText, feature, scenario) {
  const kw = keyword.trim();

  // ── Portuguese: Dado / Dado que ──────────────────────────────────────────
  if (kw === 'Dado' || kw === 'Dado que') {
    if (stepText.match(/acesso a url/i)) {
      const urlKey = extractQuotedValue(stepText);
      const url = resolveEnvValue(urlKey);
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      return;
    }
  }

  // ── Portuguese: Quando / E (shared action steps) ─────────────────────────
  if (kw === 'Quando' || kw === 'E') {
    // preencho o campo "X" com "Y"
    if (stepText.match(/preencho o campo/i)) {
      const fieldId = extractQuotedValue(stepText, 0);
      const rawValue = extractQuotedValue(stepText, 1);
      const value = resolveEnvValue(rawValue);
      await page.fill(buildInputSelector(fieldId), value);
      return;
    }
    // deixo o campo "X" em branco
    if (stepText.match(/deixo o campo.+em branco/i)) {
      const fieldId = extractQuotedValue(stepText);
      await page.fill(buildInputSelector(fieldId), '');
      return;
    }
    // clico no botão "X"
    if (stepText.match(/clico no bot[aã]o/i)) {
      const label = extractQuotedValue(stepText);
      await page.click(`button:has-text("${label}"), input[type="submit"][value="${label}"], input[value="${label}"]`);
      await page.waitForLoadState('networkidle');
      return;
    }
    // clico no link "X"
    if (stepText.match(/clico no link/i)) {
      const label = extractQuotedValue(stepText);
      await page.click(`a:has-text("${label}"), button:has-text("${label}")`);
      await page.waitForLoadState('networkidle');
      return;
    }
    // legado: insiro um nome de usuário "X" no campo "Y"
    if (stepText.match(/insiro um nome de usu[aá]rio/i)) {
      const value = extractQuotedValue(stepText);
      const field = extractQuotedValue(stepText, 1);
      await page.fill(buildInputSelector(field || 'Username'), value);
      return;
    }
    // legado: senha "X"
    if (stepText.match(/^senha\s+"([^"]+)"$/i)) {
      const password = extractQuotedValue(stepText);
      await page.fill(buildInputSelector('Password'), password);
      return;
    }
    // legado: clicar no botão "X"
    if (stepText.match(/clicar no bot[aã]o/i)) {
      const label = extractQuotedValue(stepText);
      await page.click(`input[type="submit"][value="${label}"], button:has-text("${label}"), input[value="${label}"]`);
      await page.waitForLoadState('networkidle');
      return;
    }
  }

  // ── Portuguese: Então / E (shared assertion steps) ───────────────────────
  if (kw === 'Então' || kw === 'Entao' || kw === 'E') {
    // sou redirecionado para "/path"
    if (stepText.match(/sou redirecionado para/i)) {
      const expectedPath = extractQuotedValue(stepText);
      await page.waitForURL(`**${expectedPath}**`, { timeout: 8000 });
      return;
    }
    // permaneço na página de login
    if (stepText.match(/perma(ne[cç]o|nece) na p[aá]gina de login/i)) {
      await page.waitForLoadState('networkidle');
      const url = page.url();
      if (!url.includes('login')) {
        throw new Error(`Expected to remain on login page, got "${url}"`);
      }
      return;
    }
    // vejo a mensagem de erro "X"
    if (stepText.match(/vejo a mensagem de erro/i)) {
      const text = extractQuotedValue(stepText);
      await page.waitForSelector(
        '[role=alert], .alert, .invalid-feedback, [class*="alert"]',
        { timeout: 5000 }
      ).catch(() => {});
      const alerts = await page.evaluate(() =>
        [...document.querySelectorAll('[role=alert], .alert, .invalid-feedback, [class*="alert"], span[class*="feedback"]')]
          .map(el => el.innerText.trim()).filter(Boolean).join(' | ')
      );
      if (!alerts.includes(text)) {
        throw new Error(`Expected error message "${text}", found: "${alerts || '(nenhum alerta)'}"`);
      }
      return;
    }
    // vejo o texto "X"
    if (stepText.match(/vejo o texto/i)) {
      const text = extractQuotedValue(stepText);
      await page.waitForSelector(`text=${text}`, { timeout: 5000 });
      const isVisible = await page.isVisible(`text=${text}`);
      if (!isVisible) throw new Error(`Text "${text}" not visible`);
      return;
    }
    // legado: redirecionado para a página inicial
    if (stepText.match(/redirecionado para a p[aá]gina inicial/i)) {
      await page.waitForFunction(
        () => !window.location.href.includes('login'),
        { timeout: 8000 }
      );
      return;
    }
    // legado: should see
    if (stepText.includes('should see')) {
      const text = extractQuotedValue(stepText) || extractElementName(stepText);
      await page.waitForSelector(`text=${text}`);
      const isVisible = await page.isVisible(`text=${text}`);
      if (!isVisible) throw new Error(`Element "${text}" not visible`);
      return;
    }
  }

  // ── English: Given ───────────────────────────────────────────────────────
  if (kw === 'Given') {
    if (stepText.includes('page is loaded')) {
      await page.goto(config.baseURL);
      await page.waitForLoadState('networkidle');
      return;
    }
    if (stepText.includes('user is not authenticated')) {
      await page.context().clearCookies();
      return;
    }
  }

  // ── English: When ────────────────────────────────────────────────────────
  if (kw === 'When') {
    if (stepText.includes('clicks on')) {
      const elementName = extractElementName(stepText);
      await page.click(`text=${elementName}`);
      return;
    }
    if (stepText.includes('enters')) {
      const parts = stepText.match(/enters (.+) in (.+)/);
      if (parts) {
        const selector = `input[placeholder*="${parts[2]}"], input[name*="${parts[2]}"]`;
        await page.fill(selector, parts[1]);
        return;
      }
    }
    if (stepText.includes('submits')) {
      await page.click('button[type="submit"], button:has-text("Submit")');
      return;
    }
  }

  // ── English: Then ────────────────────────────────────────────────────────
  if (kw === 'Then') {
    if (stepText.includes('should see')) {
      const text = extractElementName(stepText);
      await page.waitForSelector(`text=${text}`);
      const isVisible = await page.isVisible(`text=${text}`);
      if (!isVisible) throw new Error(`Element "${text}" not visible`);
      return;
    }
    if (stepText.includes('should not see')) {
      const text = extractElementName(stepText);
      const isVisible = await page.isVisible(`text=${text}`).catch(() => false);
      if (isVisible) throw new Error(`Element "${text}" is visible but should not be`);
      return;
    }
    if (stepText.includes('URL should be')) {
      const expectedUrl = stepText.match(/URL should be (.+)/)[1];
      const currentUrl = page.url();
      if (!currentUrl.includes(expectedUrl)) {
        throw new Error(`Expected URL to include "${expectedUrl}", but got "${currentUrl}"`);
      }
      return;
    }
  }

  console.warn(`    ⚠️  No handler for [${kw}] "${stepText}"`);
}

/**
 * Helper: extract nth quoted value from step text (0-based index)
 */
function extractQuotedValue(stepText, index = 0) {
  const matches = [...stepText.matchAll(/"([^"]+)"/g)];
  return matches[index]?.[1] || null;
}

/**
 * Helper: build input selector by placeholder, name, or id
 */
function buildInputSelector(fieldName) {
  return [
    `input[placeholder*="${fieldName}" i]`,
    `input[name*="${fieldName}" i]`,
    `input[id*="${fieldName}" i]`,
  ].join(', ');
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
  console.log(`Total:        ${total}`);
  console.log(`✅ Passed:    ${stats.passed}`);
  console.log(`❌ Failed:    ${stats.failed}`);
  console.log(`⚠️  Blocked:   ${stats.blocked}`);
  console.log(`📈 Pass Rate: ${passRate}%`);
  console.log('═'.repeat(50) + '\n');

  return stats.failed > 0 ? 1 : 0;
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
