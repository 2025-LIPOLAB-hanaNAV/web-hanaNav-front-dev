#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_TAG="${IMAGE_TAG:-${1:-web-hananav-front:offline}}"
OUTPUT_PATH="${OUTPUT_PATH:-${2:-hananav-offline-bundle.tar.gz}}"
BUNDLE_NAME="hananav-offline-bundle"
WORK_DIR="$(mktemp -d)"
BUNDLE_DIR="$WORK_DIR/$BUNDLE_NAME"
IMAGE_FILENAME="$(echo "$IMAGE_TAG" | tr '/:' '__').tar"
IMAGE_OUTPUT_PATH="$BUNDLE_DIR/images/$IMAGE_FILENAME"

trap 'rm -rf "$WORK_DIR"' EXIT

cd "$ROOT_DIR"

# Step 1: ensure image exists
"$ROOT_DIR/scripts/build-offline-image.sh" "$IMAGE_TAG"

# Step 2: prepare bundle structure
mkdir -p "$BUNDLE_DIR/images"
mkdir -p "$BUNDLE_DIR/scripts"

cp deploy/offline/docker-compose.yml "$BUNDLE_DIR/"
cp deploy/offline/.env.offline.example "$BUNDLE_DIR/.env.offline.example"
cp docs/OFFLINE_DEPLOY.md "$BUNDLE_DIR/README_OFFLINE.md"
cp deploy/offline/scripts/load-image.sh "$BUNDLE_DIR/scripts/load-image.sh"

# Step 3: export docker image
echo "[package-offline-bundle] Saving Docker image $IMAGE_TAG to $IMAGE_OUTPUT_PATH"
docker save "$IMAGE_TAG" -o "$IMAGE_OUTPUT_PATH"

# Step 4: create archive
mkdir -p "$(dirname "$OUTPUT_PATH")"
tar -czf "$OUTPUT_PATH" -C "$WORK_DIR" "$BUNDLE_NAME"

echo "[package-offline-bundle] Bundle created: $OUTPUT_PATH"
