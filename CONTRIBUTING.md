# Contributing

## Development setup

```zsh
./gradlew clean test backend:bootJar
```

## Guidelines

- Keep code, comments, and docs in US English.
- Prefer small, focused changes.
- Add or update tests for backend behavior changes (both Java and Kotlin paths).
- Do not reformat unrelated code just because your formatter got bored.
- When modifying the analyzer, test against both Java and Kotlin source files.
- When adding new building types, update the legend in `frontend/index.html` and add CSS swatches.

## Code analysis scope

Code City analyzes both Java and Kotlin source code:
- Java: Full AST parsing via JavaParser
- Kotlin: Text-based pattern matching for classes, interfaces, objects, and data classes
- Mixed projects: Both languages render with separate color families (blue for Java, teal for Kotlin)

## Pull requests

1. Create a branch
2. Make the change
3. Run the checks
4. Open a pull request with a concise description

## Checks

```zsh
./gradlew clean test backend:bootJar
```

If you touch the frontend, also make sure the Vite bundle still builds:

```zsh
./gradlew :frontend:buildFrontend
```

