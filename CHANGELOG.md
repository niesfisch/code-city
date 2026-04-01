# Changelog

All notable changes to Code City will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Kotlin language support** — Code City now analyzes Kotlin source files (`.kt`) alongside Java
  - New building types: `KOTLIN_CLASS`, `KOTLIN_INTERFACE`, `KOTLIN_OBJECT`, `KOTLIN_DATA_CLASS`
  - Kotlin types rendered in teal color family to distinguish from Java types (blue family)
  - Pattern-based Kotlin parsing complements Java AST parsing

- **Advanced code metrics and project telemetry**
  - Per-project telemetry: analysis duration, files scanned, files parsed, Java/Kotlin file counts
  - Aggregate metrics: total cyclomatic complexity, avg LOC/type, avg methods/type
  - Hotspot indicators: most complex type and largest type
  - Detailed metric reference in `README_metrics.md` with examples and ASCII city illustrations

- **Candidate filtering and search workflows**
  - Metric candidate filters with presets and custom threshold rules (`>`, `>=`, `<`, `<=`, `=`)
  - Preset clusters include ranges such as method count bands and common smell thresholds
  - Search reset/clear support and result-click camera focus integration

- **Improved interaction feedback**
  - Persistent selection lock with explicit deselection on empty-map click
  - Visual selection marker above focused buildings (dashed beacon + pulse marker)
  - Centered analysis overlay with spinner while analysis is in progress

- **Test source filtering controls**
  - Optional exclusion of test sources via `src/test/java` / `src/test/kotlin`
  - Test naming patterns supported (e.g., `Test*.java`, `*Test.java`, `*IT.java` and Kotlin equivalents)

- **Developer workflow scripts**
  - `scripts/build-all.zsh`, `scripts/build-and-start.zsh`, `scripts/start-only.zsh`, and sample-call helper scripts
  - README instructions updated to use script-first local workflows

- **Documentation and branding assets**
  - README now includes project logo, screenshots (`doc/city1.png`, `doc/city2.png`), and header demo media
  - Browser favicon wired to `doc/logo.png`
  - Explicit note that top-level directory analysis can visualize multiple projects as separate base plateaus

### Changed

- **City semantics and layout model**
  - Package hierarchy now follows Wettel-style district semantics more closely
  - Related subpackages share base plateau context and stack as nested districts
  - City framing centers the rendered cityscape and removes off-screen drift

- **UI language and labels**
  - Java-only wording updated to consistently reference Java + Kotlin where applicable
  - Project metrics and sidebar content expanded for readability and discoverability

- **Dependency upgrades** (non-breaking maintenance updates)
  - Core backend/frontend dependencies refreshed and CVE checks documented
  - License compatibility inventory maintained in `DEPENDENCIES.md`

### Fixed

- **Rendering and navigation**
  - Eliminated initial "cloud/fog wall" effect on larger projects by recalibrating camera/fog scaling
  - Fixed selection/details panel overflow issues on the right column
  - Improved focus readability in dense areas with explicit selection marker visuals

- **Analysis UX**
  - Fixed analysis wait overlay state handling so it only appears during active analysis

- **Repository hygiene**
  - Removed personal machine-specific path/name references from tracked content

### Removed

- Grid helper (now renders clean cityscape without reference grid)
- Ground plane (simplified visual focus to architecture only)
- Internal development prompts from version control

## [0.1.0] - Initial Release

### Added

- Java project scanner with include/exclude pattern support
- 3D cityscape visualization engine (Three.js/Babylon)
- Interactive camera controls (OrbitControls)
- Building metrics visualization
- Spring Boot backend with REST API
- Vite + Vue.js frontend bundled into backend jar
- GitHub Actions CI/CD pipeline for multi-platform builds
- Platform-specific runtime images (Linux, macOS, Windows)
- Sample demo project for testing
- MIT license

### Building Types

- Class
- Abstract class
- Interface
- Enum
- Record

