#!/usr/bin/env zsh
set -euo pipefail

# Start the packaged app and run a sample health + analyze call.
SCRIPT_DIR="${0:A:h}"
REPO_ROOT="${SCRIPT_DIR:h}"
JAR_PATH="${REPO_ROOT}/backend/build/libs/code-city.jar"
PORT="${PORT:-8080}"

if [[ ! -f "${JAR_PATH}" ]]; then
  echo "[run] Missing ${JAR_PATH}"
  echo "[run] Run scripts/build-all.zsh first."
  exit 1
fi

cd "${REPO_ROOT}"

echo "[run] Starting Code City on port ${PORT}..."
java -jar "${JAR_PATH}" --server.port="${PORT}" > /tmp/code-city.log 2>&1 &
APP_PID=$!

cleanup() {
  if kill -0 "${APP_PID}" 2>/dev/null; then
    echo "[run] Stopping app (pid ${APP_PID})..."
    kill "${APP_PID}" 2>/dev/null || true
    wait "${APP_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

for _ in {1..60}; do
  if curl -fsS "http://127.0.0.1:${PORT}/api/analyze/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "http://127.0.0.1:${PORT}/api/analyze/health" >/dev/null 2>&1; then
  echo "[run] Service did not become healthy in time."
  echo "[run] Last logs:"
  tail -n 80 /tmp/code-city.log || true
  exit 1
fi

echo "[run] Health OK:"
curl -fsS "http://127.0.0.1:${PORT}/api/analyze/health"
echo

echo "[run] Sample analyze call (samples/demo-project)..."
ANALYZE_PAYLOAD=$(cat <<JSON
{
  "path": "${REPO_ROOT}/samples/demo-project",
  "includePattern": "com.example.demo.*",
  "excludeTests": true
}
JSON
)

RESPONSE=$(curl -fsS -X POST "http://127.0.0.1:${PORT}/api/analyze" \
  -H 'Content-Type: application/json' \
  -d "${ANALYZE_PAYLOAD}")

# Print a short human-friendly summary without requiring jq.
python3 - <<'PY' "$RESPONSE"
import json, sys
obj = json.loads(sys.argv[1])
m = obj.get('metrics', {})
print('[run] Analyze response summary:')
print(f"  packages: {m.get('totalPackages')}")
print(f"  buildings: {len(obj.get('buildings', []))}")
print(f"  averageComplexity: {m.get('averageComplexity')}")
print(f"  analysisTimeMs: {m.get('analysisTimeMs')}")
PY

echo "[run] Done. Full app log: /tmp/code-city.log"
