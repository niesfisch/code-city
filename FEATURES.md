# Code City Features

## Language Support

### Java
- Full AST parsing with JavaParser
- Classes, abstract classes, interfaces, enums, records
- Complete metrics: method count, field count, constructor count, cyclomatic complexity
- Blue color family (blue, purple, red, green, orange)

### Kotlin
- Pattern-based parsing for `.kt` files
- Classes, data classes, interfaces, singleton objects
- Metrics extraction: methods (`fun`), fields (`val`/`var`), constructors
- Teal color family (light sea green, turquoise, cadet blue, teal)

## City Layout

### Hierarchical Package Structure
- Packages become multi-level plateaus
- Related packages nest together as districts
- Parent packages contain child packages as elevated areas
- Single-child package chains are automatically collapsed to reduce clutter
- City base (dark slate) → districts (progressively lighter blue)

### Building Dimensions (Wettel CodeCity Encoding)
- **Height**: NOM (Number of Methods) — taller = more methods
- **Width**: NOA (Number of Attributes) — wider = more fields
- **Depth**: LOC (Lines of Code, sqrt-scaled) — deeper = more code

### Color Coding
- **Type colors**: Different hues for each Java/Kotlin type
- **Complexity heat**: Orange-red glow increases with cyclomatic complexity
- Java types: Blue family
- Kotlin types: Teal family

## User Interface

### Interactive Selection
- **Click to focus**: Click buildings/plateaus to lock selection
- **Hover for details**: Hover over metrics to see explanations
- **Legend filtering**: Click legend items to highlight specific types

### Metrics Display
- Real-time analysis duration
- Project summary (packages, buildings, complexity)
- Individual selection details (methods, fields, complexity, cyclomatic)

### Visualization
- 3D camera with orbit controls
- Automatic camera positioning for any project size
- Adaptive fog that scales with project complexity
- Dynamic ground plane/grid for large projects
- Z-fighting prevention for clean rendering

## Analysis Features

### Pattern Matching
- Include patterns: `de.marcelsauer.*`, `com.example.*`
- Exclude patterns: `*.generated.*`, `*.test.*`
- Comma-separated multi-patterns supported
- Matched against package names and file paths

### Test Detection
- Automatic test source root detection (`src/test/java`, `src/test/kotlin`)
- Convention-based test naming patterns:
  - Suffixes: `Test`, `Tests`, `IT`, `ITCase`, `TestCase`, `Spec`
  - Prefixes: `Test`
- Optional exclude during analysis

### Code Metrics
- Structural metrics: NOM, NOA, LOC
- Cyclomatic complexity calculation
- Composite complexity scoring
- Per-type and aggregate statistics

## Distribution

### Packaged Formats
- Executable Spring Boot JAR (cross-platform)
- Platform-specific runtime images (jpackage):
  - Linux x64
  - macOS (arm64 + x64 via CI)
  - Windows x64

### Requirements
- Runtime: Java 21+
- No additional dependencies needed (everything bundled)

## Accessibility

- Open-source under MIT license
- Configurable via REST API
- Local file access (trusted environments)
- Browser-based visualization (runs on localhost)

## Performance

- Hierarchical layout optimizations
- Lazy metric calculations
- Efficient pattern matching
- Scales well up to thousands of classes

