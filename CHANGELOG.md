# Changelog

## [Unreleased] — 2026-03-31

### Fixed

- **Large-project fog / visibility** — on projects with 40+ packages the
  camera was placed 400+ units away from the city while fog was hardcoded at
  `near=80 / far=240`, putting the entire scene behind the grey wall. Fixed by:
  - `focusCity()` now drives camera distance from the **horizontal footprint**
    (`max(size.x, size.z)`) instead of the full 3-D diagonal — avoids
    overshooting on flat cities where building height is tiny compared to
    the floor plan width.
  - Fog `near` and `far` are scaled to the computed camera distance on every
    render (`near = distance × 1.5`, `far = distance × 4`), so atmospheric
    depth works at any project size without swallowing the whole scene.
  - Camera `far` clipping plane is bumped to `max(1000, distance × 8)` so
    nothing is geometry-clipped on extra-large projects.
  - Ground plane and grid auto-expand to `hDim × 2.5` when the city outgrows
    the default 300-unit bounds.
  - `resetCamera()` restores the default fog values when the view is cleared.

### Changed

- **Hierarchical city layout** — packages that share a common prefix are now
  visually nested. Sub-packages become elevated plateaus sitting on top of their
  parent's plateau, forming one coherent city with districts and sub-districts
  instead of isolated islands. The layout engine builds a full package tree,
  skips trivial single-child chains toward the first real branch, and then
  recursively packs children into a square-ish grid of depth-stacked plateaus.
  - Parent plateaus use a dark-slate color; child districts lighten progressively
    toward leaf level — mirrors the Wettel CodeCity district-shading convention.
  - Plateau slab thickness decreases with depth (0.9 → 0.7 → 0.55 → 0.45) to
    give the silhouette a recognisable layered look.
  - A 3 mm Z-epsilon gap between coplanar faces eliminates Z-fighting between
    plateau surfaces and building bases.

## 0.1.0

Initial open source release.

### Added

- Java project scanner with include and exclude pattern support
- Structural metrics for top-level Java types
- 3D city visualization with packages as plateaus and types as buildings
- Spring Boot backend API
- Vite and Three.js frontend bundled into the backend jar
- Sample Java project for smoke tests
- GitHub Actions build and cross-platform runtime image workflow
- MIT license and basic OSS repo docs

