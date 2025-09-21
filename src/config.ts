// 프록시 사용 여부와 URL 설정
const USE_PROXY = import.meta.env.VITE_USE_PROXY === 'true';
const PROXY_BASE_URL = import.meta.env.VITE_PROXY_BASE_URL as string | undefined;
const DIRECT_RAGFLOW_URL = import.meta.env.VITE_RAGFLOW_BASE_URL as string | undefined;

// 프록시 사용 시 프록시 URL을 사용하고, 아니면 직접 RAGFlow URL 사용
export const RAGFLOW_BASE_URL = USE_PROXY ? PROXY_BASE_URL : DIRECT_RAGFLOW_URL;
export const USE_PROXY_FLAG = USE_PROXY;
export const RAGFLOW_API_KEY = import.meta.env.VITE_RAGFLOW_API_KEY as string | undefined;
export const RAGFLOW_ASSISTANT_QUICK_ID = import.meta.env.VITE_RAGFLOW_ASSISTANT_QUICK_ID as string | undefined;
export const RAGFLOW_ASSISTANT_PRECISE_ID = import.meta.env.VITE_RAGFLOW_ASSISTANT_PRECISE_ID as string | undefined;
export const RAGFLOW_ASSISTANT_SUMMARY_ID = import.meta.env.VITE_RAGFLOW_ASSISTANT_SUMMARY_ID as string | undefined;

export function requireConfig() {
  if (!RAGFLOW_BASE_URL || !RAGFLOW_API_KEY) {
    console.warn('[RAGFlow] Missing RAGFLOW_BASE_URL or VITE_RAGFLOW_API_KEY');
    console.warn(`[RAGFlow] USE_PROXY: ${USE_PROXY}, PROXY_BASE_URL: ${PROXY_BASE_URL}, DIRECT_RAGFLOW_URL: ${DIRECT_RAGFLOW_URL}`);
  }
}
