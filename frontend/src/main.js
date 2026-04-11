import './styles.css';
import CityRenderer from './main/js/CityRenderer.js';
import { getRandomQuip } from './main/js/codeSmellQuips.js';

const elements = {
  form: document.getElementById('analysis-form'),
  projectPath: document.getElementById('projectPath'),
  folderPickerBtn: document.getElementById('folderPickerBtn'),
  includePattern: document.getElementById('includePattern'),
  excludePattern: document.getElementById('excludePattern'),
  excludeTests: document.getElementById('excludeTests'),
  analyzeButton: document.getElementById('analyzeButton'),
  resetButton: document.getElementById('resetButton'),
  flythroughButton: document.getElementById('flythroughButton'),
  tourSpeedSelect: document.getElementById('tourSpeedSelect'),
  status: document.getElementById('status'),
  summary: document.getElementById('summary'),
  metrics: document.getElementById('metrics'),
  selection: document.getElementById('selection'),
  metricTooltip: document.getElementById('metricTooltip'),
  viewerTooltip: document.getElementById('viewerTooltip'),
  legendSectionTitle: document.getElementById('legendSectionTitle'),
  legendSectionHint: document.getElementById('legendSectionHint'),
  legendEmptyState: document.getElementById('legendEmptyState'),
  searchInput: document.getElementById('searchInput'),
  searchClearButton: document.getElementById('searchClearButton'),
  searchResults: document.getElementById('searchResults'),
  error: document.getElementById('error'),
  funModeToggle: document.getElementById('funModeToggle'),
  packageDependencyToggle: document.getElementById('packageDependencyToggle'),
  buildingDependencyToggle: document.getElementById('buildingDependencyToggle'),
  dependencyOverlayStats: document.getElementById('dependencyOverlayStats'),
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
  tourPopup: document.getElementById('tourPopup'),
  apiUnavailableOverlay: document.getElementById('apiUnavailableOverlay'),
  apiUnavailableMessage: document.getElementById('apiUnavailableMessage'),
  apiUnavailableCloseButton: document.getElementById('apiUnavailableCloseButton'),
  apiUnavailableRetryButton: document.getElementById('apiUnavailableRetryButton')
};

// ── Theme Management ─────────────────────────────────────────────────────────

const AVAILABLE_THEMES = [
  { id: 'dark', label: 'Dark' },
  { id: 'midnight', label: 'Midnight' },
  { id: 'twilight', label: 'Twilight' },
  { id: 'forest', label: 'Forest' },
  { id: 'neon', label: 'Neon' }
];

function initializeTheme() {
  const savedTheme = window.localStorage.getItem('code-city.theme');
  const theme = savedTheme || 'dark';
  applyTheme(theme);
}

function applyTheme(themeName) {
  if (themeName === 'dark') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', themeName);
  }

  window.localStorage.setItem('code-city.theme', themeName);
  updateThemeButtons(themeName);
}

function updateThemeButtons(activeName) {
  const buttons = document.querySelectorAll('.theme-btn');
  buttons.forEach(btn => {
    const btnTheme = btn.getAttribute('data-theme');
    const isActive = btnTheme === activeName;
    btn.setAttribute('aria-pressed', String(isActive));
  });
}

function setupThemeHandlers() {
  const buttons = document.querySelectorAll('.theme-btn');
  if (buttons.length === 0) {
    console.warn('Theme buttons not found in DOM');
    return;
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const themeName = btn.getAttribute('data-theme');
      if (themeName) {
        applyTheme(themeName);
      }
    });
  });
}

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
    label: 'Complexity Score > 10',
    tooltip: 'Composite complexity score above 10 — likely gnarly',
    displayKey: 'complexity',
    displayLabel: 'complexity score',
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
    label: 'Complexity Score > 8',
    tooltip: 'Composite complexity score > 8 — investigate this type',
    displayKey: 'complexity',
    displayLabel: 'complexity score',
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
  onSelectionChange: renderSelection,
  onHoverChange: renderViewerTooltip,
  onTourStateChange: handleTourStateChange,
  onTourBuildingFocus: handleTourBuildingFocus,
  onDependencyOverlayChange: renderDependencyOverlayStats
});

let activeQuickFilter = null;
let apiUnavailableDismissed = false;
let funModeEnabled = true;
let lastHoveredMesh = null;
let cachedQuip = null;

// Legend highlight filter
const legendItems = Array.from(document.querySelectorAll('[data-highlight-type]'));
const legendTypeEntries = legendItems.map(item => ({
  item,
  typeKey: item.getAttribute('data-highlight-type'),
  labelElement: item.querySelector('.legend-label'),
  baseLabel: item.querySelector('.legend-label')?.textContent?.trim() ?? item.textContent.trim()
}));

legendItems.forEach(item => {
  item.addEventListener('click', () => {
    if (item.hidden) {
      return;
    }

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
    updateFlythroughButton();
  });
});

function updateLegendFilters(cityscape) {
  const typeCounts = new Map();

  for (const building of cityscape?.buildings ?? []) {
    const typeKey = building?.type;
    if (!typeKey) {
      continue;
    }
    typeCounts.set(typeKey, (typeCounts.get(typeKey) ?? 0) + 1);
  }

  let visibleCount = 0;
  let activeTypeStillVisible = false;

  for (const entry of legendTypeEntries) {
    const count = typeCounts.get(entry.typeKey) ?? 0;
    const isVisible = count > 0;
    entry.item.hidden = !isVisible;
    entry.item.classList.toggle('active', isVisible && renderer.activeHighlight === entry.typeKey);

    if (entry.labelElement) {
      entry.labelElement.textContent = isVisible
        ? `${entry.baseLabel} (${count})`
        : entry.baseLabel;
    }

    if (isVisible) {
      visibleCount += 1;
      if (renderer.activeHighlight === entry.typeKey) {
        activeTypeStillVisible = true;
      }
    }
  }

  if (!activeTypeStillVisible && renderer.activeHighlight) {
    clearLegendFilter();
  }

  if (visibleCount > 0) {
    if (elements.legendSectionTitle) {
      elements.legendSectionTitle.textContent = 'Type filters';
    }
    if (elements.legendSectionHint) {
      elements.legendSectionHint.textContent = 'Filter visible building types. Building colors show complexity heat.';
    }
  } else {
    if (elements.legendSectionTitle) {
      elements.legendSectionTitle.textContent = 'Type filters';
    }
    if (elements.legendSectionHint) {
      elements.legendSectionHint.textContent = 'Analyze a project to populate the building-type filters. Building colors show complexity heat.';
    }
  }

  elements.legendEmptyState?.classList.toggle('hidden', visibleCount > 0);
}

const savedPath = window.localStorage.getItem('code-city.projectPath');
if (savedPath) {
  elements.projectPath.value = savedPath;
}

const savedFunMode = window.localStorage.getItem('code-city.funMode');
if (savedFunMode !== null) {
  funModeEnabled = savedFunMode === 'true';
  elements.funModeToggle.checked = funModeEnabled;
}

const savedPackageDeps = window.localStorage.getItem('code-city.dependencyOverlay.packages');
if (savedPackageDeps !== null && elements.packageDependencyToggle) {
  elements.packageDependencyToggle.checked = savedPackageDeps === 'true';
}
const savedBuildingDeps = window.localStorage.getItem('code-city.dependencyOverlay.buildings');
if (savedBuildingDeps !== null && elements.buildingDependencyToggle) {
  elements.buildingDependencyToggle.checked = savedBuildingDeps === 'true';
}

function applyDependencyOverlaySettings() {
  const showPackageEdges = elements.packageDependencyToggle?.checked !== false;
  const showTypeEdges = elements.buildingDependencyToggle?.checked !== false;
  const enabled = showPackageEdges || showTypeEdges;

  renderer.setDependencyOverlayOptions({
    enabled,
    showPackageEdges,
    showTypeEdges
  });
}

function renderDependencyOverlayStats(state) {
  if (!elements.dependencyOverlayStats) {
    return;
  }

  if (!state?.enabled) {
    elements.dependencyOverlayStats.textContent = 'All arches disabled';
    return;
  }

  const pkgText = state.showPackageEdges
    ? `Pkg arches: ${state.renderedPackageArches}`
    : 'Pkg arches: off';
  const bldText = state.showTypeEdges
    ? `Bld arches: ${state.renderedTypeArches}`
    : 'Bld arches: off';
  const hint = state.showTypeEdges && state.renderedTypeArches === 0
    ? ' (select a building for local streets)'
    : '';

  elements.dependencyOverlayStats.textContent = `${pkgText} | ${bldText}${hint}`;
}

applyDependencyOverlaySettings();

// ── Directory Browser ───────────────────────────────────────────────────────

/**
 * Fetch and display directory contents for browsing projects.
 */
async function browseDirectories(dirPath) {
  try {
    const url = `/api/analyze/browse${dirPath ? `?path=${encodeURIComponent(dirPath)}` : ''}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Failed to browse directory: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    log.error('Error browsing directories:', error);
    return null;
  }
}

/**
 * Show a directory picker modal.
 * This demonstrates the ability to browse and select a folder.
 */
async function showDirectoryPicker() {
  // Start from home directory or current path
  const startPath = elements.projectPath.value || null;
  const response = await browseDirectories(startPath);

  if (!response) {
    showError('Failed to open directory browser');
    return;
  }

  if (response.error) {
    showError(`Browser error: ${response.error}`);
    return;
  }

  // Create a simple modal for directory selection
  const modal = createDirectoryBrowserModal(response);
  document.body.appendChild(modal);
}

/**
 * Create a simple directory browser modal.
 */
function createDirectoryBrowserModal(dirResponse) {
  const modal = document.createElement('div');
  modal.className = 'directory-browser-modal';
  modal.setAttribute('aria-hidden', 'false');
  modal.setAttribute('role', 'dialog');

  const overlay = document.createElement('div');
  overlay.className = 'directory-browser-overlay';
  overlay.addEventListener('click', () => modal.remove());

  const content = document.createElement('div');
  content.className = 'directory-browser-content';

  const header = document.createElement('div');
  header.className = 'directory-browser-header';
  header.innerHTML = `
    <h2>Browse Folders</h2>
    <button type="button" aria-label="Close" class="close-btn">&times;</button>
  `;
  header.querySelector('.close-btn').addEventListener('click', () => modal.remove());

  const pathDisplay = document.createElement('div');
  pathDisplay.className = 'directory-browser-path';
  pathDisplay.textContent = `Current: ${dirResponse.currentPath}`;

  const list = document.createElement('div');
  list.className = 'directory-browser-list';

  dirResponse.entries.forEach(entry => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'directory-browser-item';
    item.innerHTML = `<span class="icon">${entry.name === '..' ? '⬆' : '📁'}</span> ${entry.name}`;
    item.addEventListener('click', async () => {
      if (entry.name === '..' || entry.isDirectory) {
        // Navigate into folder
        const nextResponse = await browseDirectories(entry.path);
        if (nextResponse) {
          modal.replaceWith(createDirectoryBrowserModal(nextResponse));
        }
      }
    });
    list.appendChild(item);
  });

  const footer = document.createElement('div');
  footer.className = 'directory-browser-footer';
  const selectBtn = document.createElement('button');
  selectBtn.type = 'button';
  selectBtn.className = 'directory-browser-select-btn';
  selectBtn.textContent = 'Select this folder';
  selectBtn.addEventListener('click', () => {
    elements.projectPath.value = dirResponse.currentPath;
    window.localStorage.setItem('code-city.projectPath', dirResponse.currentPath);
    modal.remove();
  });
  footer.appendChild(selectBtn);

  content.appendChild(header);
  content.appendChild(pathDisplay);
  content.appendChild(list);
  content.appendChild(footer);

  modal.appendChild(overlay);
  modal.appendChild(content);

  return modal;
}

elements.folderPickerBtn.addEventListener('click', (event) => {
  event.preventDefault();
  showDirectoryPicker();
});

function setStatus(message) {
  elements.status.textContent = message;
}

function hasRenderedCity() {
  return (renderer.pickableMeshes?.length ?? 0) > 0;
}

function updateFlythroughButton() {
  const button = elements.flythroughButton;
  if (!button) {
    return;
  }

  const isRunning = renderer.isTourRunning === true;
  const isBusy = elements.form?.getAttribute('aria-busy') === 'true';

  if (isRunning) {
    button.textContent = 'Stop tour';
    button.classList.add('active');
  } else {
    const filterCount = renderer.getFilteredTourCandidateCount?.() ?? null;
    if (filterCount !== null) {
      button.textContent = `Tour matching (${filterCount})`;
    } else {
      button.textContent = 'Fly through';
    }
    button.classList.remove('active');
  }

  if (elements.tourSpeedSelect) {
    elements.tourSpeedSelect.disabled = isBusy || isRunning;
  }

  if (isBusy) {
    button.disabled = true;
    return;
  }

  button.disabled = !isRunning && !hasRenderedCity();
}

function handleTourStateChange(isRunning) {
  updateFlythroughButton();

  if (elements.form?.getAttribute('aria-busy') === 'true') {
    return;
  }

  if (isRunning) {
    setStatus('Touring...');
  } else if (hasRenderedCity()) {
    setStatus('Ready');
  } else {
    setStatus('Idle');
  }
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
    elements.flythroughButton,
    elements.tourSpeedSelect,
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

  updateFlythroughButton();
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

   // Add "Open file" button if building has a source file
   const sourceFileName = selection.sourceFileName || selection.fileName;
   const hasSource = sourceFileName && selection.fullName;
   const openFileBtn = hasSource
     ? `<button type="button" class="open-file-btn" data-full-name="${selection.fullName}" data-source-file="${sourceFileName}" title="View source code in popup">Open file</button>`
     : '';

   elements.selection.innerHTML = `<div class="definition-list">${rows}</div>${openFileBtn}`;

   // Attach click handler to open file button
   if (hasSource) {
     const btn = elements.selection.querySelector('.open-file-btn');
     if (btn) {
       btn.addEventListener('click', () => {
         openSourceFilePopup(selection);
       });
     }
   }
 }

 async function openSourceFilePopup(selection) {
   const projectPath = elements.projectPath.value;
   if (!projectPath) {
     showError('No project path set. Analyze a project first.');
     return;
   }

   const params = new URLSearchParams({
     projectPath,
      sourceFileName: selection.sourceFileName || selection.fileName,
     fullName: selection.fullName,
     packageName: selection.packageName || '',
     name: selection.name
   });

   try {
     const response = await fetch(`/api/analyze/source?${params}`);
     if (!response.ok) {
       showError(`Failed to load source: ${response.statusText}`);
       return;
     }

     const sourceData = await response.json();
     showSourceFileModal(sourceData);
   } catch (error) {
     showError(`Error fetching source file: ${error.message}`);
   }
 }

 function showSourceFileModal(sourceData) {
   const modal = document.createElement('div');
   modal.className = 'source-file-modal';
   modal.setAttribute('role', 'dialog');
   modal.setAttribute('aria-modal', 'true');

   const overlay = document.createElement('div');
   overlay.className = 'source-file-overlay';
   overlay.addEventListener('click', () => modal.remove());

   const content = document.createElement('div');
   content.className = 'source-file-content';

   const header = document.createElement('div');
   header.className = 'source-file-header';
   const title = document.createElement('div');
   title.className = 'source-file-title';
   title.innerHTML = `<strong>${sourceData.name}</strong> <span class="muted">${sourceData.sourceFileName}</span>`;

   const headerMeta = document.createElement('div');
   headerMeta.className = 'source-file-meta';
   headerMeta.textContent = sourceData.fullName;

   const closeBtn = document.createElement('button');
   closeBtn.type = 'button';
   closeBtn.className = 'source-file-close-btn';
   closeBtn.setAttribute('aria-label', 'Close');
   closeBtn.textContent = '×';
   closeBtn.addEventListener('click', () => modal.remove());

   header.appendChild(title);
   header.appendChild(headerMeta);
   header.appendChild(closeBtn);

   const codeContainer = document.createElement('div');
   codeContainer.className = 'source-file-code-container';

   const preTag = document.createElement('pre');
   const codeTag = document.createElement('code');
   codeTag.className = `language-${sourceData.language}`;
   codeTag.textContent = sourceData.content;
   preTag.appendChild(codeTag);
   codeContainer.appendChild(preTag);

   content.appendChild(header);
   content.appendChild(codeContainer);

   modal.appendChild(overlay);
   modal.appendChild(content);
   document.body.appendChild(modal);

   // If Prism (syntax highlighter) is available, highlight the code
   if (window.Prism && window.Prism.highlightElement) {
     window.Prism.highlightElement(codeTag);
   }
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

function renderViewerTooltip(hoverState) {
  const tooltip = elements.viewerTooltip;
  if (!tooltip) {
    return;
  }

  if (!hoverState?.data) {
    tooltip.classList.add('hidden');
    tooltip.innerHTML = '';
    lastHoveredMesh = null;
    cachedQuip = null;
    return;
  }

  const { data, point, isArch } = hoverState;

  // Handle arch hovers
  if (isArch && data) {
    const { sourceName, targetName, weight, type } = data;
    const typeLabel = type === 'package-dependency' ? 'Package Dependency' :
                      type === 'imports' ? 'Imports' :
                      type === 'imported-by' ? 'Imported By' : 'Dependency';

    const html = `
      <div class="viewer-tooltip__row">
        <span class="viewer-tooltip__label">From</span>
        <span class="viewer-tooltip__value">${sourceName}</span>
      </div>
      <div class="viewer-tooltip__row">
        <span class="viewer-tooltip__label">To</span>
        <span class="viewer-tooltip__value">${targetName}</span>
      </div>
      <div class="viewer-tooltip__row">
        <span class="viewer-tooltip__label">Type</span>
        <span class="viewer-tooltip__value">${typeLabel}</span>
      </div>
      <div class="viewer-tooltip__row">
        <span class="viewer-tooltip__label">Weight</span>
        <span class="viewer-tooltip__value">${weight} connection${weight > 1 ? 's' : ''}</span>
      </div>
    `;

    tooltip.innerHTML = html;
    tooltip.classList.remove('hidden');
    tooltip.style.left = `${point.x}px`;
    tooltip.style.top = `${point.y + 12}px`;
    return;
  }

  // Handle building/plateau hovers
  const selection = hoverState.selection ?? null;
  const isPlateau = data?.type === 'Package plateau' || selection?.kind === 'Package plateau';
  const baseRows = [
    ['Package', data.packageName ?? '—'],
    ['Name', data.name ?? '—'],
    ['Type', data.type ?? '—']
  ];

  let plateauSummaryRow = '';
  if (isPlateau && selection) {
    const buildingCount = selection.buildingCount;
    const parts = [];
    if (typeof buildingCount === 'number') {
      parts.push(`${buildingCount} building${buildingCount === 1 ? '' : 's'}`);
    }
    if (parts.length > 0) {
      plateauSummaryRow = `
        <div class="viewer-tooltip__row">
          <span class="viewer-tooltip__label">Summary</span>
          <span class="viewer-tooltip__value">${parts.join(', ')}</span>
        </div>
      `;
    }
  }

  // Add fun quip if enabled and we have selection data with metrics
  let quipRow = '';
  if (funModeEnabled && selection && !isPlateau) {
    // Only generate a new quip if we moved to a different mesh
    const currentMesh = hoverState.mesh;
    if (currentMesh !== lastHoveredMesh) {
      lastHoveredMesh = currentMesh;
      cachedQuip = generateTourQuip(selection);
    }

    if (cachedQuip) {
      const { badge, text } = cachedQuip;
      quipRow = `
        <div class="viewer-tooltip__row viewer-tooltip__quip">
          <span class="viewer-tooltip__badge">${badge}</span>
          <span class="viewer-tooltip__quip-text">${text}</span>
        </div>
      `;
    }
  }

  tooltip.innerHTML = baseRows.map(([label, value]) => `
    <div class="viewer-tooltip__row">
      <span class="viewer-tooltip__label">${label}</span>
      <span class="viewer-tooltip__value">${value}</span>
    </div>
  `).join('') + plateauSummaryRow + quipRow;

  tooltip.classList.remove('hidden');

  const parentRect = tooltip.parentElement.getBoundingClientRect();
  const tipRect = tooltip.getBoundingClientRect();
  const x = point?.x ?? 0;
  const y = point?.y ?? 0;

  let left = x + 14;
  let top = y + 14;

  if (left + tipRect.width > parentRect.width - 8) {
    left = Math.max(8, x - tipRect.width - 14);
  }
  if (top + tipRect.height > parentRect.height - 8) {
    top = Math.max(8, y - tipRect.height - 14);
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
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
  updateFlythroughButton();
}

function clearAllOverlayFilters() {
  clearSearch();
  clearMetricFilter();
  clearLegendFilter();
  renderViewerTooltip(null);
  handleTourBuildingFocus(null);
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
  updateFlythroughButton();
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
  updateFlythroughButton();
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
    applyDependencyOverlaySettings();
    updateLegendFilters(cityscape);
    renderMetrics(cityscape);
    updateFlythroughButton();
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
    updateLegendFilters(null);
    elements.summary.textContent = 'No project analyzed yet.';
    elements.metrics.innerHTML = '';
    updateFlythroughButton();
  }
});

elements.resetButton.addEventListener('click', () => {
  renderer.stopFlythroughTour?.({ preserveSelection: false });
  setBusyState(false);
  hideError();
  renderSelection(null);
  clearAllOverlayFilters();

  // Reset view should match keyboard 'F': keep data, refocus camera.
  if ((renderer.pickableMeshes?.length ?? 0) > 0) {
    renderer.clearSelectedMesh?.();
    renderer.focusCity();
    updateFlythroughButton();
    setStatus('Ready');
    return;
  }

  elements.metrics.innerHTML = '';
  elements.summary.textContent = 'No project analyzed yet.';
  renderer.reset();
  updateLegendFilters(null);
  updateFlythroughButton();
  setStatus('Idle');
});

function generateTourQuip(sel) {
  const m = sel.methods ?? 0;
  const loc = sel.linesOfCode ?? 0;
  const cyc = parseFloat(sel.cyclomatic) || 0;
  const params = sel.maxMethodParameters ?? 0;
  const statics = sel.staticMethodCount ?? 0;
  const inner = sel.innerTypeCount ?? 0;
  const comments = sel.commentLineCount ?? 0;
  const score = parseFloat(sel.complexity) || 0;

  // Detect code smells in order of severity/priority
  if (m > 30) {
    return {
      badge: 'God Class',
      emoji: '\u{1F6A8}',
      text: `${m} methods. ${getRandomQuip('godClass') || 'This class does everything.'}`
    };
  }
  if (m > 20) {
    return {
      badge: 'Chunky Class',
      emoji: '\u26A0\uFE0F',
      text: `${m} methods. ${getRandomQuip('chunkiClass') || 'Getting chunky.'}`
    };
  }
  if (loc > 500) {
    return {
      badge: 'The Novel',
      emoji: '\u{1F4DA}',
      text: `${loc} lines. ${getRandomQuip('theNovel') || 'No one has read this.'}`
    };
  }
  if (loc > 200) {
    return {
      badge: 'The Essay',
      emoji: '\u{1F4D6}',
      text: `${loc} lines. ${getRandomQuip('theEssay') || 'Technically a type.'}`
    };
  }
  if (cyc > 30) {
    return {
      badge: 'The Labyrinth',
      emoji: '\u{1F300}',
      text: `Cyclomatic complexity ${cyc}. ${getRandomQuip('labyrinth') || 'So many paths.'}`
    };
  }
  if (cyc > 10) {
    return {
      badge: 'Branch Collector',
      emoji: '\u{1F500}',
      text: `${cyc} execution paths. ${getRandomQuip('branchCollector') || 'Pray your tests cover it.'}`
    };
  }
  if (statics > 5) {
    return {
      badge: 'Utility Blob',
      emoji: '\u{1F6E0}\uFE0F',
      text: `${statics} static methods. ${getRandomQuip('utilityBlob') || 'A namespace in disguise.'}`
    };
  }
  if (params >= 7) {
    return {
      badge: 'Param Hoarder',
      emoji: '\u{1F4CB}',
      text: `${params} parameters on one method. ${getRandomQuip('paramHoarder') || 'Just use a data class.'}`
    };
  }
  if (params >= 5) {
    return {
      badge: 'Param Pusher',
      emoji: '\u{1F914}',
      text: `${params} parameters. ${getRandomQuip('paramPusher') || 'You\'re on thin ice.'}`
    };
  }
  if (inner > 0) {
    return {
      badge: 'Matryoshka',
      emoji: '\u{1FA86}',
      text: `${inner} inner type${inner > 1 ? 's' : ''}. ${getRandomQuip('matryoshka') || 'Classes all the way down.'}`
    };
  }
  if (comments === 0 && loc > 50) {
    return {
      badge: 'Silent Type',
      emoji: '\u{1F92B}',
      text: `${loc} lines, zero comments. ${getRandomQuip('silentType') || 'The author assumes you know.'}`
    };
  }
  if (score > 10) {
    return {
      badge: 'Complexity Champ',
      emoji: '\u{1F525}',
      text: `Complexity score ${score}. ${getRandomQuip('complexityChamp') || 'This building earned every floor.'}`
    };
  }

  // Default: tallest tower fallback
  return {
    badge: 'Tallest Tower',
    emoji: '\u{1F3C6}',
    text: `${m} methods, ${loc} LOC. ${getRandomQuip('tallestTower') || 'Standing tall. For now.'}`
  };
}

function handleTourBuildingFocus(selection) {
  const popup = elements.tourPopup;
  if (!popup) return;

  if (!selection) {
    popup.classList.add('hidden');
    popup.innerHTML = '';
    return;
  }

  const { badge, emoji, text } = generateTourQuip(selection);
  const pkg = selection.packageName ?? '';
  const name = selection.name ?? '';
  const type = selection.type ?? '';

  popup.innerHTML = `
    <div class="tour-popup__badge">${emoji} ${badge}</div>
    <div class="tour-popup__name">${name}</div>
    <div class="tour-popup__package">${pkg}${type ? ' \u00B7 ' + type : ''}</div>
    <div class="tour-popup__quip">${text}</div>
  `;

  // Force re-animation on each new building
  popup.classList.add('hidden');
  popup.classList.remove('hidden');
}

function getTourSpeedMultiplier() {  const val = elements.tourSpeedSelect?.value ?? 'normal';
  if (val === 'slow') return 1.8;
  if (val === 'fast') return 0.45;
  return 1.0;
}

elements.flythroughButton?.addEventListener('click', () => {
  hideError();

  if (renderer.isTourRunning) {
    renderer.stopFlythroughTour({ preserveSelection: true });
    return;
  }

  if ((renderer.getTallestBuildingMeshes?.(1)?.length ?? 0) === 0) {
    showError('Need at least one building before this thing can do a city fly-through.');
    updateFlythroughButton();
    return;
  }

  renderer.startFlythroughTour({ speedMultiplier: getTourSpeedMultiplier() }).catch(error => {
    renderer.stopFlythroughTour({ preserveSelection: true });
    showError(error.message || 'Fly-through failed.');
    updateFlythroughButton();
  });
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

elements.funModeToggle?.addEventListener('change', (event) => {
  funModeEnabled = event.target.checked;
  window.localStorage.setItem('code-city.funMode', String(funModeEnabled));
});


elements.packageDependencyToggle?.addEventListener('change', (event) => {
  window.localStorage.setItem('code-city.dependencyOverlay.packages', String(event.target.checked));
  applyDependencyOverlaySettings();
});

elements.buildingDependencyToggle?.addEventListener('change', (event) => {
  window.localStorage.setItem('code-city.dependencyOverlay.buildings', String(event.target.checked));
  applyDependencyOverlaySettings();
});

renderSelection(null);
// Initialize theme system early, after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    setupThemeHandlers();
  });
} else {
  initializeTheme();
  setupThemeHandlers();
}
setupMetricTooltips();
setupSearchHandlers();
setupMetricFilterHandlers();
updateLegendFilters(null);
updateFlythroughButton();
setStatus('Idle');
probeApiAvailability();

