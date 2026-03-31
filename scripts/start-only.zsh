#!/usr/bin/env zsh
set -euo pipefail

# Start the packaged app in the foreground.
SCRIPT_DIR="${0:A:h}"
REPO_ROOT="${SCRIPT_DIR:h}"
JAR_PATH="${REPO_ROOT}/backend/build/libs/code-city.jar"
PORT="${PORT:-8080}"

if [[ ! -f "${JAR_PATH}" ]]; then
  echo "[start] Missing ${JAR_PATH}"
  echo "[start] Run ./scripts/build-all.zsh first."
  exit 1
fi

cd "${REPO_ROOT}"

echo "[start] Starting Code City on http://127.0.0.1:${PORT}"
exec java -jar "${JAR_PATH}" --server.port="${PORT}"

