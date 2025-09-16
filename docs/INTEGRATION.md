RAGFlow Integration Guide

Overview
- This frontend integrates directly with a separate RAGFlow backend via HTTP.
- No backend code lives in this repo. Configure base URL and API key via env.

Environment
- VITE_RAGFLOW_BASE_URL: e.g., http://ragflow.yourdomain
- VITE_RAGFLOW_API_KEY: Bearer key for the RAGFlow instance

Used Endpoints
- Datasets
  - GET /api/v1/datasets
  - POST /api/v1/datasets
- Documents
  - POST /api/v1/datasets/{dataset_id}/documents
  - GET  /api/v1/datasets/{dataset_id}/documents
  - POST /api/v1/datasets/{dataset_id}/chunks (parse)
  - DELETE /api/v1/datasets/{dataset_id}/chunks (stop)
- Chunks
  - GET  /api/v1/datasets/{dataset_id}/documents/{document_id}/chunks
  - POST /api/v1/datasets/{dataset_id}/documents/{document_id}/chunks
  - PUT  /api/v1/datasets/{dataset_id}/documents/{document_id}/chunks/{chunk_id}
  - DELETE /api/v1/datasets/{dataset_id}/documents/{document_id}/chunks
  - POST /api/v1/retrieval
- Chat Assistants
  - GET  /api/v1/chats
  - POST /api/v1/chats
  - PUT  /api/v1/chats/{chat_id}
  - DELETE /api/v1/chats

Security
- Never commit API keys. Use .env files locally and CI secrets for deployments.
- If CORS issues arise, prefer a small proxy service in your infra repo to add auth and allow-list origins.

Optional Proxy (recommended)
- Stand up a tiny proxy (Node/Express/Fastify) that injects the API key server-side.
- Pros: no API key in browser, tighter CORS control, easier rate limiting.

Suggested Repo Layouts
1) Multi-repo (recommended for external engine)
   - web-hanaNav-front (this repo): UI + typed API client
   - ragflow-engine (external, separate repo)
   - ragflow-proxy (optional thin server, separate repo)

2) Monorepo (if you host a thin proxy together)
   - apps/web (this frontend)
   - apps/proxy (thin auth/CORS proxy only)
   - packages/api-client (shared TS client, possibly OpenAPI-generated)

Developer Notes
- Update env: copy .env.example to .env.local and fill values.
- Endpoints & contracts live in src/services/ragflow.ts (to be split by domain if it grows).
- For session/chat streaming, add SSE helpers under src/lib/http/sse.ts.

