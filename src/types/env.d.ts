/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RAG_API_BASE_URL: string
  readonly VITE_ASSISTANT_AVATAR_URL: string
  readonly VITE_RAG_SERVER_HOST: string
  readonly VITE_RAG_SERVER_PORT: string
  readonly VITE_RAG_SERVER_SSL: string
  readonly VITE_ENABLE_RAG_EVALUATION?: string
  readonly VITE_OLLAMA_URL?: string
  readonly VITE_OLLAMA_MODEL?: string
  readonly VITE_JUDGE_MODEL?: string
  readonly VITE_RAG_MODEL?: string
  readonly VITE_OLLAMA_AUTH_TOKEN?: string
  readonly VITE_OLLAMA_AUTH_USERNAME?: string
  readonly VITE_OLLAMA_AUTH_PASSWORD?: string
  readonly VITE_OLLAMA_AUTH_HEADER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
