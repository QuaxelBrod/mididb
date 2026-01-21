#!/usr/bin/env bash
set -euo pipefail

# Root of the project
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

usage() {
  cat <<'EOF'
Usage: cleanup_empty_midi.sh [--simulate] [--help]

Umgebungsvariablen (optional, mit Defaults):
  MONGO_URL            Standard: localhost:27017
  MONGO_DB_NAME        Standard: mididb
  MONGO_DB_COLLECTION  Standard: midifiles

Beispiele:
  bash scripts/cleanup_empty_midi.sh
  bash scripts/cleanup_empty_midi.sh --simulate
EOF
}

SIMULATE=false

for arg in "$@"; do
  case "$arg" in
    --simulate) SIMULATE=true ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unbekanntes Argument: $arg"; usage; exit 1 ;;
  esac
done

# Defaults; override by exporting before calling this script
export MONGO_URL="${MONGO_URL:-192.168.178.29:27017}"
export MONGO_DB_NAME="${MONGO_DB_NAME:-mididb}"
export MONGO_DB_COLLECTION="${MONGO_DB_COLLECTION:-midifiles}"

echo "Using MONGO_URL=${MONGO_URL}"
echo "Using MONGO_DB_NAME=${MONGO_DB_NAME}"
echo "Using MONGO_DB_COLLECTION=${MONGO_DB_COLLECTION}"

declare -a ARGS=()
$SIMULATE && ARGS+=("--simulate")

# Run the cleanup job
if ((${#ARGS[@]})); then
  npm run cleanup:empty -- "${ARGS[@]}"
else
  npm run cleanup:empty
fi
