const runtimeEnv = (typeof window !== 'undefined' ? (window as any).__ENV__ : undefined) ?? {};

const readEnv = (key: string): string | undefined => {
  const runtimeValue = runtimeEnv[key];
  if (typeof runtimeValue === 'string' && runtimeValue.length > 0 && runtimeValue !== 'undefined') {
    return runtimeValue;
  }
  const metaValue = (import.meta.env as any)[key];
  return typeof metaValue === 'string' ? metaValue : undefined;
};

const readEnvFlag = (key: string): boolean => {
  const value = readEnv(key);
  return value === 'true' || value === '1';
};

// 프록시 사용 여부와 URL 설정
const USE_PROXY = readEnvFlag('VITE_USE_PROXY');
const PROXY_BASE_URL = readEnv('VITE_PROXY_BASE_URL');
const DIRECT_RAGFLOW_URL = readEnv('VITE_RAGFLOW_BASE_URL');

// 프록시 사용 시 프록시 URL을 사용하고, 아니면 직접 RAGFlow URL 사용
export const RAGFLOW_BASE_URL = USE_PROXY ? PROXY_BASE_URL : DIRECT_RAGFLOW_URL;
export const USE_PROXY_FLAG = USE_PROXY;
export const RAGFLOW_API_KEY = readEnv('VITE_RAGFLOW_API_KEY');
export const RAGFLOW_ASSISTANT_QUICK_ID = readEnv('VITE_RAGFLOW_ASSISTANT_QUICK_ID');
export const RAGFLOW_ASSISTANT_PRECISE_ID = readEnv('VITE_RAGFLOW_ASSISTANT_PRECISE_ID');
export const RAGFLOW_ASSISTANT_SUMMARY_ID = readEnv('VITE_RAGFLOW_ASSISTANT_SUMMARY_ID');

// 리랭커 설정
export const RAGFLOW_RERANK_MODEL = readEnv('VITE_RAGFLOW_RERANK_MODEL');
export const RAGFLOW_ENABLE_RERANK = readEnvFlag('VITE_RAGFLOW_ENABLE_RERANK');

// 리랭커 설정을 가져오는 유틸리티 함수
export function getRerankConfig(): { rerank_id?: string } {
  if (!RAGFLOW_ENABLE_RERANK || !RAGFLOW_RERANK_MODEL) {
    console.log('🔧 리랭커 비활성화됨 - 환경변수 확인: ENABLE =', RAGFLOW_ENABLE_RERANK, 'MODEL =', RAGFLOW_RERANK_MODEL);
    return {};
  }

  console.log('🔧 리랭커 활성화됨:', RAGFLOW_RERANK_MODEL);
  return { rerank_id: RAGFLOW_RERANK_MODEL };
}

export function requireConfig() {
  if (!RAGFLOW_BASE_URL || !RAGFLOW_API_KEY) {
    console.warn('[RAGFlow] Missing RAGFLOW_BASE_URL or VITE_RAGFLOW_API_KEY');
    console.warn(`[RAGFlow] USE_PROXY: ${USE_PROXY}, PROXY_BASE_URL: ${PROXY_BASE_URL}, DIRECT_RAGFLOW_URL: ${DIRECT_RAGFLOW_URL}`);
  }
}
