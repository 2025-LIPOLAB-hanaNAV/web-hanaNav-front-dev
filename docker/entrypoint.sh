#!/bin/sh
set -e

TEMPLATE_PATH="/usr/share/nginx/html/env-config.template.js"
TARGET_PATH="/usr/share/nginx/html/env-config.js"

if [ -f "$TEMPLATE_PATH" ]; then
  echo "[entrypoint] Generating runtime env config from template"
  envsubst '
    $VITE_RAGFLOW_BASE_URL
    $VITE_RAGFLOW_API_KEY
    $VITE_RAGFLOW_ASSISTANT_QUICK_ID
    $VITE_RAGFLOW_ASSISTANT_PRECISE_ID
    $VITE_RAGFLOW_ASSISTANT_SUMMARY_ID
    $VITE_RAGFLOW_ENABLE_RERANK
    $VITE_RAGFLOW_RERANK_MODEL
    $VITE_OLLAMA_URL
    $VITE_ENABLE_RAG_EVALUATION
    $VITE_OLLAMA_MODEL
    $VITE_USE_PROXY
    $VITE_PROXY_BASE_URL
  ' < "$TEMPLATE_PATH" > "$TARGET_PATH" || {
    echo "[entrypoint] Failed to render env-config.js, continuing with defaults" >&2
  }
else
  echo "[entrypoint] Template not found, skipping env substitution"
fi

exec "$@"
