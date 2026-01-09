#!/usr/bin/env bash
set -euo pipefail

# Root of the project
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

usage() {
  cat <<'EOF'
Usage: import_pattern.sh <directory>

Beispiel:
  bash scripts/import_pattern.sh /path/to/midis
EOF
}

if [ $# -lt 1 ]; then
  usage
  exit 1
fi

IMPORT_DIR="$1"

# Defaults; override by exporting before calling this script
export MONGO_URL="${MONGO_URL:-192.168.178.29:27017}"
export MONGO_DB_NAME="${MONGO_DB_NAME:-mididb}"
export MONGO_DB_COLLECTION="${MONGO_DB_COLLECTION:-midifiles}"
# Increase heap a bit if needed
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"

echo "Using MONGO_URL=${MONGO_URL}"
echo "Using MONGO_DB_NAME=${MONGO_DB_NAME}"
echo "Using MONGO_DB_COLLECTION=${MONGO_DB_COLLECTION}"
echo "Importing from: ${IMPORT_DIR}"

npm run import:pattern -- "${IMPORT_DIR}"
