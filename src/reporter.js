import fs from 'fs';
import path from 'path';

/**
 * Build the HTML string for the test report
 */
function buildHtml(run) {
  const { timestamp, features, stats } = run;
  const total = stats.passed + stats.failed + stats.blocked;
  const passRate = total > 0 ? ((stats.passed / total) * 100).toFixed(1) : '0.0';
  const passColor = stats.failed === 0 ? '#16a34a' : '#dc2626';

  const scenarioRows = features.flatMap(f =>
    f.scenarios.map(s => {
      const icon = s.status === 'passed' ? '✅' : s.status === 'failed' ? '❌' : '⚠️';
      const rowClass = s.status === 'passed' ? 'row-pass' : s.status === 'failed' ? 'row-fail' : 'row-blocked';
      const duration = s.duration != null ? `${(s.duration / 1000).toFixed(2)}s` : '-';

      const stepsHtml = s.steps.map(st => {
        const stepIcon = st.status === 'passed' ? '✓' : st.status === 'failed' ? '✗' : '–';
        const stepClass = st.status === 'passed' ? 'step-pass' : st.status === 'failed' ? 'step-fail' : 'step-skip';
        const errorHtml = st.error
          ? `<div class="step-error">${escapeHtml(st.error)}</div>`
          : '';
        return `
          <div class="step ${stepClass}">
            <span class="step-icon">${stepIcon}</span>
            <span class="step-keyword">${escapeHtml(st.keyword)}</span>
            <span class="step-text">${escapeHtml(st.text)}</span>
            ${errorHtml}
          </div>`;
      }).join('');

      return `
        <tr class="${rowClass}">
          <td class="td-icon">${icon}</td>
          <td class="td-feature">${escapeHtml(f.name)}</td>
          <td class="td-scenario">
            <div class="scenario-name">${escapeHtml(s.name)}</div>
            <div class="steps-container">${stepsHtml}</div>
          </td>
          <td class="td-duration">${duration}</td>
          <td class="td-status ${s.status}">${s.status.toUpperCase()}</td>
        </tr>`;
    })
  ).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>QAlfred – Relatório de Testes</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; color: #1e293b; }

    header {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
      color: #fff; padding: 28px 40px; display: flex;
      align-items: center; justify-content: space-between;
    }
    header h1 { font-size: 22px; font-weight: 700; letter-spacing: .5px; }
    header .meta { font-size: 12px; color: #94a3b8; margin-top: 4px; }

    .summary {
      display: flex; gap: 16px; padding: 24px 40px;
    }
    .card {
      flex: 1; background: #fff; border-radius: 10px;
      padding: 18px 22px; box-shadow: 0 1px 4px rgba(0,0,0,.08);
      border-top: 4px solid transparent;
    }
    .card.total  { border-color: #3b82f6; }
    .card.passed { border-color: #16a34a; }
    .card.failed { border-color: #dc2626; }
    .card.rate   { border-color: ${passColor}; }
    .card .label { font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: .6px; }
    .card .value { font-size: 32px; font-weight: 700; margin-top: 4px; }
    .card.total  .value { color: #3b82f6; }
    .card.passed .value { color: #16a34a; }
    .card.failed .value { color: #dc2626; }
    .card.rate   .value { color: ${passColor}; }

    .section { padding: 0 40px 40px; }
    .section h2 { font-size: 14px; text-transform: uppercase; color: #64748b;
      letter-spacing: .8px; margin-bottom: 12px; }

    table { width: 100%; border-collapse: collapse; background: #fff;
      border-radius: 10px; overflow: hidden;
      box-shadow: 0 1px 4px rgba(0,0,0,.08); font-size: 13px; }
    th { background: #0f172a; color: #e2e8f0; padding: 11px 14px;
      text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
    td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    tr.row-pass:hover { background: #f0fdf4; }
    tr.row-fail { background: #fff5f5; }
    tr.row-fail:hover { background: #fee2e2; }
    tr.row-blocked { background: #fffbeb; }

    .td-icon { font-size: 16px; width: 36px; text-align: center; }
    .td-feature { color: #64748b; font-size: 12px; white-space: nowrap; }
    .td-duration { color: #94a3b8; font-size: 12px; white-space: nowrap; }
    .td-status { font-size: 11px; font-weight: 700; letter-spacing: .5px; white-space: nowrap; }
    .td-status.passed { color: #16a34a; }
    .td-status.failed { color: #dc2626; }
    .td-status.blocked { color: #d97706; }

    .scenario-name { font-weight: 600; margin-bottom: 6px; }
    .steps-container { display: none; }
    tr.row-fail .steps-container { display: block; }

    .step { display: flex; align-items: baseline; gap: 6px;
      font-size: 11.5px; padding: 2px 0; }
    .step-icon { font-weight: 700; min-width: 12px; }
    .step-keyword { color: #6366f1; font-weight: 600; min-width: 52px; }
    .step-text { color: #475569; }
    .step.step-pass .step-icon { color: #16a34a; }
    .step.step-fail .step-icon { color: #dc2626; }
    .step.step-fail .step-text { color: #dc2626; font-weight: 500; }
    .step-error { margin: 3px 0 3px 18px; font-size: 11px; color: #dc2626;
      background: #fee2e2; border-radius: 4px; padding: 4px 8px;
      border-left: 3px solid #dc2626; white-space: pre-wrap; }

    footer { text-align: center; padding: 20px; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>

<header>
  <div>
    <h1>QAlfred – Relatório de Testes</h1>
    <div class="meta">Gerado em ${timestamp.replace('_', ' ').replace(/-/g, (m, o) => o > 10 ? ':' : '-')}</div>
  </div>
  <div style="font-size:28px">📋</div>
</header>

<div class="summary">
  <div class="card total">
    <div class="label">Total</div>
    <div class="value">${total}</div>
  </div>
  <div class="card passed">
    <div class="label">Passou</div>
    <div class="value">${stats.passed}</div>
  </div>
  <div class="card failed">
    <div class="label">Falhou</div>
    <div class="value">${stats.failed}</div>
  </div>
  <div class="card rate">
    <div class="label">Taxa de Aprovação</div>
    <div class="value">${passRate}%</div>
  </div>
</div>

<div class="section">
  <h2>Cenários</h2>
  <table>
    <thead>
      <tr>
        <th></th>
        <th>Feature</th>
        <th>Cenário</th>
        <th>Duração</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${scenarioRows}
    </tbody>
  </table>
</div>

<footer>QAlfred E2E Test Runner · Playwright + Gherkin</footer>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Generate PDF report from a run result object.
 * Uses an existing Playwright browser instance.
 *
 * @param {import('playwright').Browser} browser
 * @param {object} run  - { timestamp, features, stats }
 * @param {string} outputDir - e.g. './documentos'
 * @returns {string} path to the generated PDF
 */
export async function generateReport(browser, run, outputDir = './documentos') {
  fs.mkdirSync(outputDir, { recursive: true });

  const html = buildHtml(run);
  const pdfPath = path.join(outputDir, `Relatorio-${run.timestamp}.pdf`);

  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    });
  } finally {
    await page.close();
  }

  return pdfPath;
}
