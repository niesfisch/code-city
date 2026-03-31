import './styles.css';
import CityRenderer from './main/js/CityRenderer.js';

const elements = {
  form: document.getElementById('analysis-form'),
  projectPath: document.getElementById('projectPath'),
  includePattern: document.getElementById('includePattern'),
  excludePattern: document.getElementById('excludePattern'),
  excludeTests: document.getElementById('excludeTests'),
  resetButton: document.getElementById('resetButton'),
  status: document.getElementById('status'),
  summary: document.getElementById('summary'),
  metrics: document.getElementById('metrics'),
  selection: document.getElementById('selection'),
  metricTooltip: document.getElementById('metricTooltip'),
  error: document.getElementById('error')
};

const METRIC_EXPLANATIONS = {
  methods: 'Number of methods (NOM) declared by the selected type.',
  fields: 'Number of fields/attributes (NOA) declared by the selected type.',
  constructors: 'Number of constructors declared by the selected type.',
  linesOfCode: 'Approximate lines of code (LOC) for the type body.',
  cyclomatic: 'Cyclomatic complexity: higher means more branching paths to test and reason about.',
  complexity: 'Composite complexity score from methods, fields, constructors, cyclomatic complexity, and LOC.',
  maxMethodParameters: 'Maximum number of parameters on a single method. Values \u22655 suggest a "Long Parameter List" smell \u2014 consider a parameter object.',
  staticMethodCount: 'Number of static methods. High values may indicate a utility class or procedural-style code leaking into an object.',
  innerTypeCount: 'Number of nested type declarations inside this type. Inner types often signal that the class is doing too much.',
  commentLineCount: 'Lines occupied by comments (including Javadoc). Low relative to LOC may indicate poor documentation coverage.',
  buildingCount: 'Total number of building objects inside this package plateau.',
  averageHeight: 'Average building height in this package. Height mainly follows method count.'
};

const renderer = new CityRenderer('viewer', {
  onSelectionChange: renderSelection
});

// Legend highlight filter
const legendItems = document.querySelectorAll('[data-highlight-type]');
legendItems.forEach(item => {
  item.addEventListener('click', () => {
    const typeKey = item.getAttribute('data-highlight-type');
    renderer.highlightByType(typeKey);
    // toggle active class — renderer.highlightByType already toggles internally
    const willBeActive = renderer.activeHighlight === typeKey;
    legendItems.forEach(el => el.classList.remove('active'));
    if (willBeActive) {
      item.classList.add('active');
    }
  });
});

const savedPath = window.localStorage.getItem('code-city.projectPath');
if (savedPath) {
  elements.projectPath.value = savedPath;
}

function setStatus(message) {
  elements.status.textContent = message;
}

function showError(message) {
  elements.error.textContent = message;
  elements.error.classList.remove('hidden');
}

function hideError() {
  elements.error.textContent = '';
  elements.error.classList.add('hidden');
}

function renderSelection(selection) {
  hideMetricTooltip();

  if (!selection) {
    elements.selection.innerHTML = '<div class="muted">Hover or click a plateau or building.</div>';
    return;
  }

  const rows = Object.entries(selection)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => {
      const metricAttr = METRIC_EXPLANATIONS[key] ? `data-metric-key="${key}"` : '';
      return `
      <div class="definition-row">
        <span class="metric-label" ${metricAttr}>${formatKey(key)}</span>
        <span>${formatValue(value)}</span>
      </div>
    `;
    })
    .join('');

  elements.selection.innerHTML = `<div class="definition-list">${rows}</div>`;
}

function showMetricTooltip(anchorElement, text) {
  const tooltip = elements.metricTooltip;
  if (!tooltip) {
    return;
  }

  tooltip.textContent = text;
  tooltip.classList.remove('hidden');

  const panelRect = tooltip.parentElement.getBoundingClientRect();
  const anchorRect = anchorElement.getBoundingClientRect();
  const tipRect = tooltip.getBoundingClientRect();

  let left = anchorRect.left - panelRect.left + (anchorRect.width / 2) - (tipRect.width / 2);
  left = Math.max(8, Math.min(left, panelRect.width - tipRect.width - 8));

  let top = anchorRect.top - panelRect.top - tipRect.height - 8;
  if (top < 24) {
    top = anchorRect.bottom - panelRect.top + 8;
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideMetricTooltip() {
  const tooltip = elements.metricTooltip;
  if (!tooltip) {
    return;
  }
  tooltip.classList.add('hidden');
}

function setupMetricTooltips() {
  elements.selection.addEventListener('mousemove', event => {
    const label = event.target.closest('.metric-label[data-metric-key]');
    if (!label || !elements.selection.contains(label)) {
      hideMetricTooltip();
      return;
    }

    const metricKey = label.dataset.metricKey;
    const text = METRIC_EXPLANATIONS[metricKey];
    if (!text) {
      hideMetricTooltip();
      return;
    }
    showMetricTooltip(label, text);
  });

  elements.selection.addEventListener('mouseleave', () => hideMetricTooltip());
}

function renderMetrics(cityscape) {
  const metrics = cityscape.metrics;
  const ms = metrics.analysisTimeMs ?? 0;
  const timeLabel = ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`;
  elements.summary.textContent = `${metrics.totalPackages} packages, ${cityscape.buildings.length} buildings, average complexity ${metrics.averageComplexity.toFixed(2)} — scanned ${metrics.filesScanned} files, analyzed in ${timeLabel}.`;

  const mostComplex = metrics.mostComplexClass ? metrics.mostComplexClass.split('.').pop() : '—';
  const largest     = metrics.largestClass     ? metrics.largestClass.split('.').pop()     : '—';

  elements.metrics.innerHTML = `
    <div class="metric-grid">
      <div class="metric-card"><span>Files scanned</span><strong>${metrics.filesScanned}</strong></div>
      <div class="metric-card"><span>Java files</span><strong>${metrics.javaFilesScanned}</strong></div>
      <div class="metric-card"><span>Kotlin files</span><strong>${metrics.kotlinFilesScanned}</strong></div>
      <div class="metric-card"><span>Files parsed</span><strong>${metrics.filesParsed}</strong></div>
      <div class="metric-card"><span>Packages</span><strong>${metrics.totalPackages}</strong></div>
      <div class="metric-card"><span>Types</span><strong>${cityscape.buildings.length}</strong></div>
      <div class="metric-card"><span>Methods</span><strong>${metrics.totalMethods}</strong></div>
      <div class="metric-card"><span>Fields</span><strong>${metrics.totalFields}</strong></div>
      <div class="metric-card"><span>Lines</span><strong>${metrics.totalLines}</strong></div>
      <div class="metric-card"><span>Avg LOC / type</span><strong>${metrics.avgLinesPerClass?.toFixed(1) ?? '—'}</strong></div>
      <div class="metric-card"><span>Avg methods / type</span><strong>${metrics.avgMethodsPerClass?.toFixed(1) ?? '—'}</strong></div>
      <div class="metric-card"><span>Total cyclomatic</span><strong>${metrics.totalCyclomatic?.toFixed(0) ?? '—'}</strong></div>
      <div class="metric-card metric-card--highlight" title="${metrics.mostComplexClass ?? ''}"><span>Most complex</span><strong>${mostComplex}</strong></div>
      <div class="metric-card metric-card--highlight" title="${metrics.largestClass ?? ''}"><span>Largest type</span><strong>${largest}</strong></div>
      <div class="metric-card"><span>Analysis time</span><strong>${timeLabel}</strong></div>
    </div>
  `;
}

function formatKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, value => value.toUpperCase());
}

function formatValue(value) {
  return typeof value === 'number' ? value.toString() : String(value);
}

async function analyzeProject() {
  hideError();
  renderSelection(null);

  const payload = {
    path: elements.projectPath.value.trim(),
    includePattern: elements.includePattern.value.trim(),
    excludePattern: elements.excludePattern.value.trim(),
    excludeTests: elements.excludeTests.checked
  };

  if (!payload.path) {
    showError('Project directory is required. No wizardry happens without a path.');
    return;
  }

  window.localStorage.setItem('code-city.projectPath', payload.path);
  setStatus('Analyzing...');

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Analysis failed.' }));
    throw new Error(error.message || 'Analysis failed.');
  }

  const cityscape = await response.json();
  renderer.render(cityscape);
  renderMetrics(cityscape);
  setStatus('Ready');
}

elements.form.addEventListener('submit', async event => {
  event.preventDefault();
  try {
    await analyzeProject();
  } catch (error) {
    renderer.reset();
    elements.summary.textContent = 'No project analyzed yet.';
    elements.metrics.innerHTML = '';
    showError(error.message);
    setStatus('Failed');
  }
});

elements.resetButton.addEventListener('click', () => {
  hideError();
  renderSelection(null);
  elements.metrics.innerHTML = '';
  elements.summary.textContent = 'No project analyzed yet.';
  legendItems.forEach(el => el.classList.remove('active'));
  renderer.reset();
  setStatus('Idle');
});

renderSelection(null);
setupMetricTooltips();
setStatus('Idle');

