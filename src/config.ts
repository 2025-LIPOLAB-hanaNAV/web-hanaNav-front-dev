export const RAGFLOW_BASE_URL = import.meta.env.VITE_RAGFLOW_BASE_URL as string | undefined;
export const RAGFLOW_API_KEY = import.meta.env.VITE_RAGFLOW_API_KEY as string | undefined;
export const RAGFLOW_ASSISTANT_QUICK_ID = import.meta.env.VITE_RAGFLOW_ASSISTANT_QUICK_ID as string | undefined;
export const RAGFLOW_ASSISTANT_PRECISE_ID = import.meta.env.VITE_RAGFLOW_ASSISTANT_PRECISE_ID as string | undefined;
export const RAGFLOW_ASSISTANT_SUMMARY_ID = import.meta.env.VITE_RAGFLOW_ASSISTANT_SUMMARY_ID as string | undefined;

export function requireConfig() {
  if (!RAGFLOW_BASE_URL || !RAGFLOW_API_KEY) {
    console.warn('[RAGFlow] Missing VITE_RAGFLOW_BASE_URL or VITE_RAGFLOW_API_KEY');
  }
}
