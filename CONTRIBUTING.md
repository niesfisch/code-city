# Contributing

## Development setup

```zsh
./gradlew clean test backend:bootJar
```

## Guidelines

- Keep code, comments, and docs in US English.
- Prefer small, focused changes.
- Add or update tests for backend behavior changes.
- Do not reformat unrelated code just because your formatter got bored.

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

