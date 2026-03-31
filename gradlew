#!/usr/bin/env sh
set -eu

GRADLE_VERSION="8.10.2"
BASE_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DIST_DIR="$BASE_DIR/.gradle-dist"
GRADLE_HOME="$DIST_DIR/gradle-$GRADLE_VERSION"
ARCHIVE="$DIST_DIR/gradle-$GRADLE_VERSION-bin.zip"
GRADLE_BIN="$GRADLE_HOME/bin/gradle"
DOWNLOAD_URL="https://services.gradle.org/distributions/gradle-$GRADLE_VERSION-bin.zip"

mkdir -p "$DIST_DIR"

if [ ! -x "$GRADLE_BIN" ]; then
  echo "Bootstrapping Gradle $GRADLE_VERSION ..."

  if [ ! -f "$ARCHIVE" ]; then
    if command -v curl >/dev/null 2>&1; then
      curl -fsSL "$DOWNLOAD_URL" -o "$ARCHIVE"
    elif command -v wget >/dev/null 2>&1; then
      wget -q "$DOWNLOAD_URL" -O "$ARCHIVE"
    else
      echo "Neither curl nor wget is available to download Gradle." >&2
      exit 1
    fi
  fi

  rm -rf "$GRADLE_HOME"
  if command -v unzip >/dev/null 2>&1; then
    unzip -q "$ARCHIVE" -d "$DIST_DIR"
  else
    python3 - <<'PY' "$ARCHIVE" "$DIST_DIR"
import sys
import zipfile
zip_path, target = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(zip_path) as archive:
    archive.extractall(target)
PY
  fi
fi

exec "$GRADLE_BIN" "$@"

