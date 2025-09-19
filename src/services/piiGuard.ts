import { USE_PROXY, PROXY_BASE_URL } from '../config';

export interface PIIGuardRequest {
  text: string;
}

export interface PIIGuardResponse {
  answer: string;
  pii_score: number;
  blocked: boolean;
  matches: any[];
  prompt_injection?: {
    injection_detected: boolean;
    attack_types: string[];
    confidence: number;
    details: string;
  };
}

export async function checkPIIGuard(text: string): Promise<PIIGuardResponse> {
  try {
    const url = USE_PROXY
      ? '/api/pii/guard'
      : 'http://localhost:3000/guard';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`PII Guard API 요청 실패: ${response.status}`);
    }

    const result = await response.json() as PIIGuardResponse;
    return result;
  } catch (error) {
    console.error('PII Guard API 호출 실패:', error);
    throw new Error('PII Guard 서비스에 연결할 수 없습니다.');
  }
}