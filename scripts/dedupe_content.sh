#!/usr/bin/env bash
set -euo pipefail

# Root of the project
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

usage() {
  cat <<'EOF'
Usage: dedupe_content.sh [--merge] [--dry-run] [--help]

Umgebungsvariablen (optional, mit Defaults):
  MONGO_URL            Standard: 192.168.178.29:27017
  MONGO_DB_NAME        Standard: mididb
  MONGO_DB_COLLECTION  Standard: midifiles

Beispiele:
  bash scripts/dedupe_content.sh
  bash scripts/dedupe_content.sh --merge
  bash scripts/dedupe_content.sh --merge --dry-run
EOF
}

MERGE=false
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --merge) MERGE=true ;;
    --dry-run) DRY_RUN=true ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unbekanntes Argument: $arg"; usage; exit 1 ;;
  esac
done

# Defaults; override by exporting before calling this script
export MONGO_URL="${MONGO_URL:-192.168.178.29:27017}"
export MONGO_DB_NAME="${MONGO_DB_NAME:-mididb}"
export MONGO_DB_COLLECTION="${MONGO_DB_COLLECTION:-midifiles}"
# Increase heap a bit to handle large collections (override by exporting NODE_OPTIONS yourself)
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"

echo "Using MONGO_URL=${MONGO_URL}"
echo "Using MONGO_DB_NAME=${MONGO_DB_NAME}"
echo "Using MONGO_DB_COLLECTION=${MONGO_DB_COLLECTION}"

declare -a ARGS=()
$MERGE && ARGS+=("--merge")
$DRY_RUN && ARGS+=("--dry-run")

# Run the dedupe job
if ((${#ARGS[@]})); then
  npm run dedupe:content -- "${ARGS[@]}"
else
  npm run dedupe:content
fi
