#!/usr/bin/env zsh
set -euo pipefail

# Build frontend + backend, run tests, and produce the executable Spring Boot jar.
SCRIPT_DIR="${0:A:h}"
REPO_ROOT="${SCRIPT_DIR:h}"

cd "${REPO_ROOT}"

echo "[build] Running full build (clean + tests + bootJar)..."
./gradlew clean test backend:bootJar

echo
ls -lh backend/build/libs/*.jar
echo "[build] Done."

