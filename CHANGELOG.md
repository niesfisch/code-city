# Changelog

All notable changes to Code City will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Kotlin language support** — Code City now analyzes Kotlin source files (`.kt`) alongside Java
  - New building types: `KOTLIN_CLASS`, `KOTLIN_INTERFACE`, `KOTLIN_OBJECT`, `KOTLIN_DATA_CLASS`
  - Kotlin types rendered in teal color family to distinguish from Java types (blue family)
  - Metrics extraction for Kotlin: methods (`fun`), fields (`val`/`var`), constructors
  - Pattern-based parsing for Kotlin (complementary to full AST parsing for Java)
  - Mixed Java/Kotlin projects render both languages together with separate visual identities

- **Hierarchical city layout** — packages are now visually nested as districts instead of isolated islands
  - Parent packages form base plateaus that contain child packages as elevated districts
  - Chain-skipping prevents trivial single-child package hierarchies from cluttering the layout
  - Depth-based plateau colors and heights mirror Wettel CodeCity convention

- **Interactive UI enhancements**
  - Click-to-focus: clicking a building/plateau locks selection until you click empty space
  - Metric tooltips: hover over selection metrics to see contextual explanations
  - Legend filtering: click legend items to highlight/filter specific building types

- **Large-project optimization**
  - Automatic fog and camera scaling based on city size
  - Ground plane and grid auto-expand for large projects
  - Z-fighting prevention with epsilon gaps between coplanar surfaces

- **Analysis metrics display**
  - Project analysis duration shown in metrics panel
  - Wettel CodeCity canonical encoding: Height=NOM, Width=NOA, Depth=LOC
  - Cyclomatic complexity heat coloring (type hue → orange-red as complexity rises)

### Changed

- **Dependency upgrades** (non-breaking)
  - Spring Boot 3.2.3 → 3.2.8
  - JavaParser 3.25.4 → 3.26.1
  - Lombok 1.18.30 → 1.18.34
  - Apache Commons Lang3 3.14.0 → 3.15.0
  - Apache Commons IO 2.11.0 → 2.17.0
  - Vite 7.1.5 → 7.1.11+ (fixes CVE-2025-62522)
  - Three.js 0.164.1 → 0.165.0

- **Documentation**
  - README updated to reflect Java + Kotlin support
  - All path references are now relative and user-agnostic
  - Contributing guidelines extended for Kotlin development

### Fixed

- **Security**: Removed personal SSH key references from README
- **Rendering**: Eliminated grid and ground plane visual clutter
- **Large projects**: Fixed camera/fog positioning that caused "fog wall" effect at distance

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

