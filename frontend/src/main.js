import './styles.css';
import CityRenderer from './main/js/CityRenderer.js';

const elements = {
  form: document.getElementById('analysis-form'),
  projectPath: document.getElementById('projectPath'),
  includePattern: document.getElementById('includePattern'),
  excludePattern: document.getElementById('excludePattern'),
  excludeTests: document.getElementById('excludeTests'),
  analyzeButton: document.getElementById('analyzeButton'),
  resetButton: document.getElementById('resetButton'),
  status: document.getElementById('status'),
  summary: document.getElementById('summary'),
  metrics: document.getElementById('metrics'),
  selection: document.getElementById('selection'),
  metricTooltip: document.getElementById('metricTooltip'),
  searchInput: document.getElementById('searchInput'),
  searchClearButton: document.getElementById('searchClearButton'),
  searchResults: document.getElementById('searchResults'),
  error: document.getElementById('error'),
  // metric filter
  quickFilterChips: document.getElementById('quickFilterChips'),
  filterMetric: document.getElementById('filterMetric'),
  filterOp: document.getElementById('filterOp'),
  filterValue: document.getElementById('filterValue'),
  filterApplyBtn: document.getElementById('filterApplyBtn'),
  filterResultBar: document.getElementById('filterResultBar'),
  filterResultCount: document.getElementById('filterResultCount'),
  filterClearBtn: document.getElementById('filterClearBtn'),
  filterResultList: document.getElementById('filterResultList'),
  analysisOverlay: document.getElementById('analysisOverlay'),
  analysisOverlayMessage: document.getElementById('analysisOverlayMessage'),
  apiUnavailableOverlay: document.getElementById('apiUnavailableOverlay'),
  apiUnavailableMessage: document.getElementById('apiUnavailableMessage'),
  apiUnavailableCloseButton: document.getElementById('apiUnavailableCloseButton'),
  apiUnavailableRetryButton: document.getElementById('apiUnavailableRetryButton')
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

// ── Metric filter ───────────────────────────────────────────────────────────

/**
 * Pre-defined smell presets shown as quick-filter chips.
 * predicateFn receives the raw Metrics object straight from the backend.
 */
const QUICK_FILTERS = [
  {
    id: 'methods-10-20',
    label: 'Methods 10-20',
    tooltip: 'Types with 10 to 20 methods \u2014 getting chunky',
    displayKey: 'methodCount',
    displayLabel: 'methods',
    predicate: m => m.methodCount >= 10 && m.methodCount <= 20
  },
  {
    id: 'methods-20-plus',
    label: 'Methods 20+',
    tooltip: 'Types with more than 20 methods \u2014 strong God Class candidate',
    displayKey: 'methodCount',
    displayLabel: 'methods',
    predicate: m => m.methodCount > 20
  },
  {
    id: 'loc-100-plus',
    label: 'LOC > 100',
    tooltip: 'Types above 100 LOC \u2014 worth a look',
    displayKey: 'linesOfCode',
    displayLabel: 'LOC',
    predicate: m => m.linesOfCode > 100
  },
  {
    id: 'loc-200-plus',
    label: 'LOC > 200',
    tooltip: 'Types above 200 LOC \u2014 strong refactor candidate',
    displayKey: 'linesOfCode',
    displayLabel: 'LOC',
    predicate: m => m.linesOfCode > 200
  },
  {
    id: 'cyclomatic-10-plus',
    label: 'Cyclomatic > 10',
    tooltip: 'Types with summed cyclomatic complexity above 10',
    displayKey: 'cyclomatic',
    displayLabel: 'cyclomatic',
    predicate: m => m.cyclomatic > 10
  },
  {
    id: 'cyclomatic-30-plus',
    label: 'Cyclomatic > 30',
    tooltip: 'Types with many execution paths \u2014 testing pain ahead',
    displayKey: 'cyclomatic',
    displayLabel: 'cyclomatic',
    predicate: m => m.cyclomatic > 30
  },
  {
    id: 'complexity-10-plus',
    label: 'Complexity > 10',
    tooltip: 'Composite complexity score above 10 \u2014 likely gnarly',
    displayKey: 'complexity',
    displayLabel: 'score',
    predicate: m => m.complexity > 10
  },
  {
    id: 'huge-loc',
    label: 'LOC > 500',
    tooltip: 'Types above 500 LOC \u2014 yeah, that thing needs help',
    displayKey: 'linesOfCode',
    displayLabel: 'LOC',
    predicate: m => m.linesOfCode > 500
  },
  {
    id: 'high-score',
    label: 'Score > 8',
    tooltip: 'Composite complexity score > 8 \u2014 investigate this type',
    displayKey: 'complexity',
    displayLabel: 'score',
    predicate: m => m.complexity > 8
  },
  {
    id: 'long-params',
    label: 'Long Params',
    tooltip: 'Max method params \u2265 5 \u2014 consider a parameter object',
    displayKey: 'maxMethodParameters',
    displayLabel: 'max params',
    predicate: m => m.maxMethodParameters >= 5
  },
  {
    id: 'util-blob',
    label: 'Utility Blob',
    tooltip: 'Static methods > 5 \u2014 procedural code in an OO costume',
    displayKey: 'staticMethodCount',
    displayLabel: 'static',
    predicate: m => m.staticMethodCount > 5
  },
  {
    id: 'no-docs',
    label: 'No Docs',
    tooltip: 'LOC > 50 with zero comment lines \u2014 document this',
    displayKey: 'linesOfCode',
    displayLabel: 'LOC',
    predicate: m => m.commentLineCount === 0 && m.linesOfCode > 50
  },
  {
    id: 'nested',
    label: 'Nested Types',
    tooltip: 'Has inner type declarations \u2014 consider extracting them',
    displayKey: 'innerTypeCount',
    displayLabel: 'inner types',
    predicate: m => m.innerTypeCount > 0
  }
];

/** Available metrics for the custom filter dropdown. */
const FILTER_METRICS = [
  { key: 'methodCount',         label: 'Methods (NOM)' },
  { key: 'fieldCount',          label: 'Fields (NOA)' },
  { key: 'linesOfCode',         label: 'LOC' },
  { key: 'cyclomatic',          label: 'Cyclomatic' },
  { key: 'complexity',          label: 'Complexity score' },
  { key: 'maxMethodParameters', label: 'Max params' },
  { key: 'staticMethodCount',   label: 'Static methods' },
  { key: 'innerTypeCount',      label: 'Inner types' },
  { key: 'commentLineCount',    label: 'Comment lines' }
];

const FILTER_OPS = [
  { op: '>',  label: '>'  },
  { op: '>=', label: '>=' },
  { op: '<',  label: '<'  },
  { op: '<=', label: '<=' },
  { op: '==', label: '='  }
];

const renderer = new CityRenderer('viewer', {
  onSelectionChange: renderSelection
});

let activeQuickFilter = null;
let apiUnavailableDismissed = false;

// Legend highlight filter
const legendItems = document.querySelectorAll('[data-highlight-type]');
legendItems.forEach(item => {
  item.addEventListener('click', () => {
    const typeKey = item.getAttribute('data-highlight-type');
    // legend filter is mutually exclusive with metric filter and name search
    clearMetricFilter();
    clearSearch();
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

function showApiUnavailableOverlay(message, options = {}) {
  const { force = false } = options;
  if (apiUnavailableDismissed && !force) {
    return;
  }

  elements.apiUnavailableMessage.textContent = message;
  elements.apiUnavailableOverlay.classList.remove('hidden');
  elements.apiUnavailableOverlay.setAttribute('aria-hidden', 'false');
}

function hideApiUnavailableOverlay({ resetDismissed = false } = {}) {
  elements.apiUnavailableOverlay.classList.add('hidden');
  elements.apiUnavailableOverlay.setAttribute('aria-hidden', 'true');
  if (resetDismissed) {
    apiUnavailableDismissed = false;
  }
}

function dismissApiUnavailableOverlay() {
  apiUnavailableDismissed = true;
  hideApiUnavailableOverlay();
}

function isApiUnavailableError(error) {
  if (!error) {
    return false;
  }

  const message = String(error.message ?? error);
  return error instanceof TypeError
    || /Failed to fetch/i.test(message)
    || /NetworkError/i.test(message)
    || /Load failed/i.test(message)
    || /ERR_CONNECTION_REFUSED/i.test(message);
}

async function probeApiAvailability({ forceOverlay = false } = {}) {
  try {
    const response = await fetch('/api/analyze/health', {
      cache: 'no-store',
      headers: {
        Accept: 'application/json, text/plain, */*'
      }
    });

    if (!response.ok) {
      throw new Error(`Health endpoint returned ${response.status}`);
    }

    hideApiUnavailableOverlay({ resetDismissed: true });
    if (elements.status.textContent === 'Backend unavailable') {
      setStatus('Idle');
    }
    return true;
  } catch {
    setStatus('Backend unavailable');
    showApiUnavailableOverlay(
      'The frontend cannot reach `/api/analyze/health`. Start Code City, verify the port, or open the app through the packaged backend server.',
      { force: forceOverlay }
    );
    return false;
  }
}

function setBusyState(isBusy, message = 'Parsing sources, collecting metrics, and building the city. Grab a sip.') {
  elements.analysisOverlay.classList.toggle('hidden', !isBusy);
  elements.analysisOverlay.setAttribute('aria-hidden', String(!isBusy));
  elements.analysisOverlayMessage.textContent = message;

  if (isBusy) {
    hideApiUnavailableOverlay();
  }

  elements.form.setAttribute('aria-busy', String(isBusy));

  const controls = [
    elements.projectPath,
    elements.includePattern,
    elements.excludePattern,
    elements.excludeTests,
    elements.analyzeButton,
    elements.resetButton,
    elements.searchInput,
    elements.searchClearButton,
    elements.filterMetric,
    elements.filterOp,
    elements.filterValue,
    elements.filterApplyBtn,
    elements.filterClearBtn
  ];

  controls.forEach(control => {
    if (control) {
      control.disabled = isBusy;
    }
  });

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.disabled = isBusy;
  });
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

function renderSearchResults(results) {
  if (!results || results.length === 0) {
    elements.searchResults.innerHTML = '<div class="muted">No results</div>';
    return;
  }

  elements.searchResults.innerHTML = results.map((result, idx) => `
    <div class="search-result-item" data-mesh-index="${idx}">
      <strong>${result.name}</strong>
      <span>${result.packageName}</span>
    </div>
  `).join('');

  // Attach click handlers to focus on each result
  elements.searchResults.querySelectorAll('.search-result-item').forEach((item, idx) => {
    item.addEventListener('click', () => {
      const result = results[idx];
      renderer.selectMesh(result.mesh, { focusCamera: true });
    });
  });
}

function handleSearch(query) {
  if (!query || !query.trim()) {
    elements.searchResults.innerHTML = '';
    renderer.clearSearchHighlight();
    elements.searchClearButton.disabled = true;
    return;
  }

  // name search is mutually exclusive with metric filter and legend type filter
  clearMetricFilter();
  clearLegendFilter();

  const matches = renderer.searchByName(query);
  const matchMeshes = matches.map(m => m.mesh);

  renderer.highlightSearchResults(matchMeshes);
  renderSearchResults(matches);
  elements.searchClearButton.disabled = false;
}

function clearSearch() {
  elements.searchInput.value = '';
  elements.searchResults.innerHTML = '';
  renderer.clearSearchHighlight();
  elements.searchClearButton.disabled = true;
}

function clearLegendFilter() {
  legendItems.forEach(el => el.classList.remove('active'));
  renderer.clearHighlight();
}

function clearAllOverlayFilters() {
  clearSearch();
  clearMetricFilter();
  clearLegendFilter();
}

// ── Metric filter ─────────────────────────────────────────────────────────

/**
 * Apply a metric filter: dim all non-matching buildings, show result list.
 * Mutually exclusive with name search and legend type filter.
 */
function applyMetricFilter(predicate, displayKey, displayLabel) {
  clearSearch();
  clearLegendFilter();

  const matches = renderer.filterBuildings(predicate);
  renderer.highlightByMetricFilter(matches.map(m => m.mesh));
  renderFilterResults(matches, displayKey, displayLabel);
}

/** Clear metric filter UI and renderer state. */
function clearMetricFilter() {
  activeQuickFilter = null;
  elements.quickFilterChips?.querySelectorAll('.filter-chip')
    .forEach(c => c.classList.remove('active'));
  renderer.clearMetricFilter();
  elements.filterResultBar?.classList.add('hidden');
  if (elements.filterResultList) {
    elements.filterResultList.innerHTML = '';
  }
}

/** Render the metric filter result list. */
function renderFilterResults(matches, displayKey, displayLabel) {
  const { filterResultBar, filterResultCount, filterResultList } = elements;
  filterResultBar.classList.remove('hidden');

  if (matches.length === 0) {
    filterResultCount.textContent = '0 matches';
    filterResultList.innerHTML =
      '<div class="muted" style="font-size:0.82rem">No buildings match this filter.</div>';
    return;
  }

  filterResultCount.textContent =
    `${matches.length} match${matches.length === 1 ? '' : 'es'}`;

  // Sort worst offenders first (highest metric value at top)
  const sorted = displayKey
    ? [...matches].sort(
        (a, b) => (b.rawMetrics?.[displayKey] ?? 0) - (a.rawMetrics?.[displayKey] ?? 0)
      )
    : matches;

  const MAX_SHOWN = 15;
  const shown = sorted.slice(0, MAX_SHOWN);
  const overflow = sorted.length - MAX_SHOWN;

  const listHtml = shown.map(result => {
    const val = displayKey && result.rawMetrics != null
      ? result.rawMetrics[displayKey]
      : null;
    const badge = val != null
      ? `<span class="filter-result-badge">${formatFilterVal(val)} ${displayLabel}</span>`
      : '';
    return `
      <div class="search-result-item filter-result-item">
        <div class="filter-result-header"><strong>${result.name}</strong>${badge}</div>
        <span>${result.packageName}</span>
      </div>`;
  }).join('');

  const moreHtml = overflow > 0
    ? `<div class="filter-more-hint">...and ${overflow} more</div>`
    : '';

  filterResultList.innerHTML = listHtml + moreHtml;

  shown.forEach((result, idx) => {
    const items = filterResultList.querySelectorAll('.filter-result-item');
    items[idx]?.addEventListener('click', () => {
      renderer.selectMesh(result.mesh, { focusCamera: true });
    });
  });
}

function formatFilterVal(val) {
  if (typeof val !== 'number') return String(val);
  return Number.isInteger(val) ? String(val) : val.toFixed(2);
}

function setupMetricFilterHandlers() {
  // Populate metric select
  FILTER_METRICS.forEach(({ key, label }) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = label;
    elements.filterMetric.appendChild(opt);
  });

  // Populate operator select
  FILTER_OPS.forEach(({ op, label }) => {
    const opt = document.createElement('option');
    opt.value = op;
    opt.textContent = label;
    elements.filterOp.appendChild(opt);
  });

  // Build quick-filter chips
  elements.quickFilterChips.innerHTML = QUICK_FILTERS.map(f =>
    `<button type="button" class="filter-chip" data-filter-id="${f.id}" title="${f.tooltip}">${f.label}</button>`
  ).join('');

  elements.quickFilterChips.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const filterId = chip.dataset.filterId;

      if (activeQuickFilter === filterId) {
        // Toggle off
        clearMetricFilter();
        return;
      }

      const filter = QUICK_FILTERS.find(f => f.id === filterId);
      if (!filter) return;

      elements.quickFilterChips.querySelectorAll('.filter-chip')
        .forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeQuickFilter = filterId;

      applyMetricFilter(filter.predicate, filter.displayKey, filter.displayLabel);
    });
  });

  // Custom filter apply
  elements.filterApplyBtn.addEventListener('click', applyCustomFilter);
  elements.filterValue.addEventListener('keydown', event => {
    if (event.key === 'Enter') applyCustomFilter();
  });

  // Clear button
  elements.filterClearBtn.addEventListener('click', () => {
    clearMetricFilter();
    renderer.clearMetricFilter();
  });
}

function applyCustomFilter() {
  const metricKey = elements.filterMetric.value;
  const op = elements.filterOp.value;
  const threshold = parseFloat(elements.filterValue.value);
  if (isNaN(threshold)) return;

  const metricEntry = FILTER_METRICS.find(m => m.key === metricKey);
  const displayLabel = metricEntry?.label ?? metricKey;

  // Clear any active quick-filter chip
  activeQuickFilter = null;
  elements.quickFilterChips.querySelectorAll('.filter-chip')
    .forEach(c => c.classList.remove('active'));

  const predicate = raw => {
    const v = raw[metricKey];
    switch (op) {
      case '>':  return v > threshold;
      case '>=': return v >= threshold;
      case '<':  return v < threshold;
      case '<=': return v <= threshold;
      case '==': return v === threshold;
      default:   return false;
    }
  };

  applyMetricFilter(predicate, metricKey, displayLabel);
}

// ── Search ─────────────────────────────────────────────────────────────────

function setupSearchHandlers() {
  elements.searchInput.addEventListener('input', event => {
    handleSearch(event.target.value);
  });

  elements.searchInput.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      clearSearch();
    }
  });

  elements.searchClearButton.addEventListener('click', () => {
    clearSearch();
    elements.searchInput.focus();
  });
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
  setBusyState(true);
  setStatus('Analyzing...');

  try {
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
    hideApiUnavailableOverlay({ resetDismissed: true });
    clearAllOverlayFilters();
    renderer.render(cityscape);
    renderMetrics(cityscape);
    setStatus('Ready');
  } finally {
    setBusyState(false);
  }
}

elements.form.addEventListener('submit', async event => {
  event.preventDefault();
  try {
    await analyzeProject();
  } catch (error) {
    if (isApiUnavailableError(error)) {
      showApiUnavailableOverlay(
        'The analyze request could not reach the REST API. Start the backend, verify the URL/port, then retry.',
        { force: true }
      );
      hideError();
      setStatus('Backend unavailable');
    } else {
      showError(error.message);
      setStatus('Failed');
    }

    renderer.reset();
    elements.summary.textContent = 'No project analyzed yet.';
    elements.metrics.innerHTML = '';
  }
});

elements.resetButton.addEventListener('click', () => {
  setBusyState(false);
  hideError();
  renderSelection(null);
  elements.metrics.innerHTML = '';
  elements.summary.textContent = 'No project analyzed yet.';
  clearAllOverlayFilters();
  renderer.reset();
  setStatus('Idle');
});

elements.apiUnavailableCloseButton.addEventListener('click', () => {
  dismissApiUnavailableOverlay();
});

elements.apiUnavailableRetryButton.addEventListener('click', async () => {
  const wasAvailable = await probeApiAvailability({ forceOverlay: true });
  if (wasAvailable) {
    setStatus('Idle');
  }
});

renderSelection(null);
setupMetricTooltips();
setupSearchHandlers();
setupMetricFilterHandlers();
setStatus('Idle');
probeApiAvailability();

