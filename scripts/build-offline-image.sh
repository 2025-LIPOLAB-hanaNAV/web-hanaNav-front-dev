#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_TAG="${1:-web-hananav-front:offline}"

cd "$ROOT_DIR"

echo "[build-offline-image] Installing dependencies via npm ci"
npm ci

echo "[build-offline-image] Building production bundle"
npm run build

echo "[build-offline-image] Building Docker image $IMAGE_TAG"
docker build -t "$IMAGE_TAG" .

echo "[build-offline-image] Done"
