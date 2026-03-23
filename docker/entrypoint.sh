#!/bin/sh
set -e

# --- Smart dependency installer ---
# Runs on container start. Handles four scenarios:
#   1. No lockfile exists          → generate one (first-time setup)
#   2. Lockfile or package.json changed → reinstall
#   3. Lockfile out of sync        → update lockfile, then install
#   4. Dependencies up-to-date     → skip install (instant start)

# Hash lockfile + all package.json files. If ANY of them change, we reinstall.
compute_hash() {
  cat pnpm-lock.yaml package.json packages/*/package.json docs/package.json 2>/dev/null \
    | md5sum | cut -d' ' -f1
}

install_deps() {
  # Use the pre-fetched store from the Docker image (no network needed).
  # Try frozen install first (fast, lockfile must match package.json).
  # If it fails, the lockfile is out of sync — update it automatically.
  STORE_FLAG="--store-dir /pnpm/store"
  if pnpm install --frozen-lockfile $STORE_FLAG 2>/dev/null; then
    echo "[entrypoint] Installed from lockfile."
  else
    echo "[entrypoint] Lockfile out of sync with package.json — updating..."
    pnpm install $STORE_FLAG
    echo "[entrypoint] Lockfile updated. Remember to commit pnpm-lock.yaml."
  fi
  compute_hash > node_modules/.deps-hash
}

if [ ! -f pnpm-lock.yaml ]; then
  echo "[entrypoint] No lockfile found — running pnpm install to generate one..."
  pnpm install --store-dir /pnpm/store
  compute_hash > node_modules/.deps-hash
else
  CURRENT_HASH=$(compute_hash)
  STORED_HASH=""
  [ -f node_modules/.deps-hash ] && STORED_HASH=$(cat node_modules/.deps-hash)

  if [ "$CURRENT_HASH" != "$STORED_HASH" ]; then
    echo "[entrypoint] Dependencies changed — installing..."
    install_deps
  else
    echo "[entrypoint] Dependencies up-to-date — skipping install."
  fi
fi

exec "$@"
