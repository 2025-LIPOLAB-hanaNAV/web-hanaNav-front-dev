/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RAG_API_BASE_URL: string
  readonly VITE_ASSISTANT_AVATAR_URL: string
  readonly VITE_RAG_SERVER_HOST: string
  readonly VITE_RAG_SERVER_PORT: string
  readonly VITE_RAG_SERVER_SSL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}