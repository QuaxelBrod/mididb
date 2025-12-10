#!/usr/bin/env bash
set -euo pipefail

# Root of the project
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

# Defaults; override by exporting before calling this script
export MONGO_URL="${MONGO_URL:-192.168.178.29:27017}"
export MONGO_DB_NAME="${MONGO_DB_NAME:-mididb}"
export MONGO_DB_COLLECTION="${MONGO_DB_COLLECTION:-midifiles}"

echo "Using MONGO_URL=${MONGO_URL}"
echo "Using MONGO_DB_NAME=${MONGO_DB_NAME}"
echo "Using MONGO_DB_COLLECTION=${MONGO_DB_COLLECTION}"

# Run the dedupe job; forward extra args to npm if needed
npm run dedupe:content -- "$@"
