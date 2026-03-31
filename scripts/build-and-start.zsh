#!/usr/bin/env zsh
set -euo pipefail

# Build everything and start the app in one go.
SCRIPT_DIR="${0:A:h}"
REPO_ROOT="${SCRIPT_DIR:h}"
JAR_PATH="${REPO_ROOT}/backend/build/libs/code-city.jar"
PORT="${PORT:-8080}"

cd "${REPO_ROOT}"

echo "[build-and-start] Running full build (clean + tests + bootJar)..."
./gradlew clean test backend:bootJar

echo
ls -lh backend/build/libs/*.jar
echo "[build-and-start] Build complete."
echo

# Verify the jar was created
if [[ ! -f "${JAR_PATH}" ]]; then
  echo "[build-and-start] Error: ${JAR_PATH} not found"
  exit 1
fi

echo "[build-and-start] Starting Code City on http://127.0.0.1:${PORT}"
exec java -jar "${JAR_PATH}" --server.port="${PORT}"

