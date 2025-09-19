export const USE_PROXY = true; // 프록시 서버 사용
export const PROXY_BASE_URL = '';

export const RAGFLOW_BASE_URL = import.meta.env.VITE_RAGFLOW_BASE_URL as string | undefined;
export const RAGFLOW_API_KEY = import.meta.env.VITE_RAGFLOW_API_KEY as string | undefined;
export const RAGFLOW_ASSISTANT_QUICK_ID = import.meta.env.VITE_RAGFLOW_ASSISTANT_QUICK_ID as string | undefined;
export const RAGFLOW_ASSISTANT_PRECISE_ID = import.meta.env.VITE_RAGFLOW_ASSISTANT_PRECISE_ID as string | undefined;
export const RAGFLOW_ASSISTANT_SUMMARY_ID = import.meta.env.VITE_RAGFLOW_ASSISTANT_SUMMARY_ID as string | undefined;

export function requireConfig() {
  console.log('[Config] 프록시 서버 모드로 실행중 (Vite 프록시 사용)');
  console.log('[Config] Environment variables:', {
    RAGFLOW_BASE_URL,
    RAGFLOW_API_KEY: RAGFLOW_API_KEY ? `${RAGFLOW_API_KEY.substring(0, 10)}...` : 'undefined',
    RAGFLOW_ASSISTANT_QUICK_ID,
    RAGFLOW_ASSISTANT_PRECISE_ID,
    RAGFLOW_ASSISTANT_SUMMARY_ID,
    USE_PROXY,
    PROXY_BASE_URL
  });
}
