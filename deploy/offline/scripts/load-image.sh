#!/usr/bin/env sh
set -e

BUNDLE_DIR=$(dirname "$0")/..
IMAGE_TAR=${1:-$BUNDLE_DIR/images/web-hananav-front-offline.tar}

if [ ! -f "$IMAGE_TAR" ]; then
  echo "Image archive not found: $IMAGE_TAR" >&2
  exit 1
fi

echo "Loading Docker image from $IMAGE_TAR"
docker load -i "$IMAGE_TAR"
