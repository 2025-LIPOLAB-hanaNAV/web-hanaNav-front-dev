import { evaluateWithOllama } from './ollama';
import {
  STORAGE_KEYS
} from '../types/evaluation';
import type {
  EvaluationResult,
  EvaluationRequest,
  EvaluationMetrics,
  EvaluationSummary,
  EvaluationConfig,
  EvaluationOptions,
  EvaluationStatus,
  GoldDataset,
  GoldDatasetItem,
  EnhancedEvaluationResult
} from '../types/evaluation';

// Vite 번들 환경에서도 안전하게 env 값을 읽어오기 위한 유틸리티
const runtimeEnv = (() => {
  const merged: Record<string, unknown> = {};

  const assign = (source?: Record<string, unknown>) => {
    if (!source) return;
    Object.entries(source).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        merged[key] = value;
      }
    });
  };

  try {
    if (typeof window !== 'undefined' && (window as any)?.__ENV__) {
      assign((window as any).__ENV__ as Record<string, unknown>);
    }
  } catch (error) {
    console.warn('Failed to access window.__ENV__:', error);
  }

  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env) {
      assign((import.meta as any).env as Record<string, unknown>);
    }
  } catch (error) {
    console.warn('Failed to access import.meta.env:', error);
  }

  if (typeof process !== 'undefined' && (process as any)?.env) {
    assign((process as any).env as Record<string, unknown>);
  }

  return merged;
})();

const getEnvValue = (key: string): unknown => runtimeEnv[key];

const resolveEnvFlag = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }
  return fallback;
};

const resolveEnvString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return fallback;
};

const ENV_EVALUATION_ENABLED = resolveEnvFlag(getEnvValue('VITE_ENABLE_RAG_EVALUATION'), false);
const DEFAULT_JUDGE_MODEL = resolveEnvString(
  getEnvValue('VITE_JUDGE_MODEL') ?? getEnvValue('VITE_OLLAMA_MODEL'),
  'gemma3:12b'
);
const DEFAULT_RAG_MODEL = resolveEnvString(getEnvValue('VITE_RAG_MODEL'), DEFAULT_JUDGE_MODEL);

export function isEvaluationFeatureAvailable(): boolean {
  return ENV_EVALUATION_ENABLED;
}

// 기본 설정
const DEFAULT_CONFIG: EvaluationConfig = {
  enabled: ENV_EVALUATION_ENABLED,
  judge_model_name: DEFAULT_JUDGE_MODEL,
  rag_model_name: DEFAULT_RAG_MODEL,
  timeout_ms: 15000,
  cache_enabled: true,
  pii_masking_enabled: true,
  weights: {
    accuracy: 0.4,
    relevance: 0.25,
    readability: 0.25,
    pii: 0.1
  }
};

// PII 마스킹 함수
function maskPII(text: string): string {
  if (!text) return text;

  let masked = text;

  // 전화번호 패턴 (010-1234-5678, 02-123-4567 등)
  masked = masked.replace(/\b\d{2,3}-?\d{3,4}-?\d{4}\b/g, '***-****-****');

  // 계좌번호 패턴 (123-45-678901)
  masked = masked.replace(/\b\d{3}-?\d{2}-?\d{6,7}\b/g, '***-**-******');

  // 주민등록번호 패턴 (123456-1234567)
  masked = masked.replace(/\b\d{6}-?\d{7}\b/g, '******-*******');

  // 이메일 일부 마스킹 (example@domain.com → ex***@domain.com)
  masked = masked.replace(/([a-zA-Z0-9._%+-]{2})[a-zA-Z0-9._%+-]*@/g, '$1***@');

  return masked;
}

// 캐시 키 생성
function generateCacheKey(request: EvaluationRequest): string {
  const questionHash = btoa(request.question).slice(0, 8);
  const answerHash = btoa(request.answer).slice(0, 8);
  return `${request.session_id}_${request.assistant_id}_${questionHash}_${answerHash}`;
}

// JSON 안전 파싱 (견고한 JSON 추출)
function safeJSONParse(text: string): any {
  try {
    // 먼저 전체 텍스트를 JSON으로 파싱 시도
    return JSON.parse(text);
  } catch {
    try {
      // JSON 블록 추출 시도 (첫 번째 { 부터 마지막 } 까지)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // 모든 파싱 실패 시 null 반환
    }
  }
  return null;
}

// 기본 평가 결과 생성 (폴백)
function createFallbackEvaluation(request: EvaluationRequest, error?: string): EvaluationResult {
  // 간단한 휴리스틱 점수 계산
  const hasAnswer = request.answer && request.answer.trim().length > 0;
  const hasKeywords = request.question && request.answer &&
    request.answer.toLowerCase().includes(request.question.toLowerCase().split(' ')[0]);

  const baseScore = hasAnswer ? 0.5 : 0.1;
  const keywordBonus = hasKeywords ? 0.3 : 0;
  const fallbackScore = Math.min(baseScore + keywordBonus, 1.0);

  return {
    id: `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    question: request.question,
    answer: request.answer,
    sources: request.sources?.map(s => ({
      id: s.id,
      title: s.title,
      snippet: s.content.slice(0, 100)
    })),
    retrieved_doc_ids: request.retrieved_doc_ids,
    metrics: {
      accuracy: {
        doc_match: fallbackScore,
        answer_from_retrieved: fallbackScore,
        no_hallucination: fallbackScore,
        weighted_accuracy: fallbackScore,
        weighted_score: fallbackScore,
        why: {
          doc_match: '자동 평가 실패',
          answer_from_retrieved: '자동 평가 실패',
          no_hallucination: '자동 평가 실패'
        }
      },
      relevance: {
        aligns_with_intent: fallbackScore,
        topicality: fallbackScore,
        weighted_relevance: fallbackScore,
        weighted_score: fallbackScore,
        why: {
          aligns_with_intent: '자동 평가 실패',
          topicality: '자동 평가 실패'
        }
      },
      readability: {
        concise: fallbackScore,
        no_redundancy: fallbackScore,
        weighted_readability: fallbackScore,
        weighted_score: fallbackScore,
        why: {
          concise: '자동 평가 실패',
          no_redundancy: '자동 평가 실패'
        }
      },
      pii: {
        no_unnecessary_pii: 1.0,
        proper_masking: 1.0,
        weighted_privacy: 1.0,
        weighted_score: 1.0,
        why: {
          no_unnecessary_pii: '자동 평가 실패',
          proper_masking: '자동 평가 실패'
        }
      }
    },
    overall_score: fallbackScore,
    assistant_id: request.assistant_id,
    session_id: request.session_id,
    error: error || '평가 모델 응답 파싱 실패'
  };
}

// 전체 점수 계산
function calculateOverallScore(metrics: EvaluationMetrics, config = DEFAULT_CONFIG): number {
  const { weights } = config;

  const accuracy = metrics.accuracy?.weighted_accuracy || 0;
  const relevance = metrics.relevance?.weighted_relevance || 0;
  const readability = metrics.readability?.weighted_readability || 0;
  const pii = metrics.pii?.weighted_privacy || 0;

  const overall = (
    weights.accuracy * accuracy +
    weights.relevance * relevance +
    weights.readability * readability +
    weights.pii * pii
  );

  return Math.round(overall * 1000) / 1000; // 소수점 3자리로 클램프
}

// 평가 프롬프트 생성
function createEvaluationPrompt(request: EvaluationRequest, config = DEFAULT_CONFIG): string {
  const maskedQuestion = config.pii_masking_enabled ? maskPII(request.question) : request.question;
  const maskedAnswer = config.pii_masking_enabled ? maskPII(request.answer) : request.answer;
  const retrievedDocIds = request.retrieved_doc_ids || [];

  return `당신은 엄격한 RAG 시스템 평가자입니다. 다음 질문과 답변을 4가지 지표로 평가해주세요.

질문: ${maskedQuestion}
답변: ${maskedAnswer}
검색된 문서 ID: ${retrievedDocIds.join(', ') || '없음'}

평가 기준:
1. 정확도 (accuracy): 답변의 정확성과 사실성 (40% 가중치)
   - doc_match: 검색된 문서와의 일치도 (0/1)
   - answer_from_retrieved: 검색 결과 기반 답변 여부 (0/1)
   - no_hallucination: 허위 정보 없음 (0/1)

2. 관련성 (relevance): 질문과 답변의 관련성 (25% 가중치)
   - aligns_with_intent: 질문 의도와 일치 (0/1)
   - topicality: 주제 관련성 (0/1)

3. 가독성 (readability): 답변의 명확성과 간결성 (25% 가중치)
   - concise: 간결성 (0/1)
   - no_redundancy: 중복 없음 (0/1)

4. 개인정보 보호 (pii): 개인정보 노출 방지 (10% 가중치)
   - no_unnecessary_pii: 불필요한 개인정보 없음 (0/1)
   - proper_masking: 적절한 마스킹 (0/1)

**중요: 반드시 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.**

{
  "accuracy": {
    "doc_match": 0,
    "answer_from_retrieved": 0,
    "no_hallucination": 1,
    "weighted_accuracy": 0.333,
    "why": {
      "doc_match": "이유 설명",
      "answer_from_retrieved": "이유 설명",
      "no_hallucination": "이유 설명"
    }
  },
  "relevance": {
    "aligns_with_intent": 1,
    "topicality": 1,
    "weighted_relevance": 1.0,
    "why": {
      "aligns_with_intent": "이유 설명",
      "topicality": "이유 설명"
    }
  },
  "readability": {
    "concise": 1,
    "no_redundancy": 1,
    "weighted_readability": 1.0,
    "why": {
      "concise": "이유 설명",
      "no_redundancy": "이유 설명"
    }
  },
  "pii": {
    "no_unnecessary_pii": 1,
    "proper_masking": 1,
    "weighted_privacy": 1.0,
    "why": {
      "no_unnecessary_pii": "이유 설명",
      "proper_masking": "이유 설명"
    }
  }
}`;
}

// 메인 평가 함수
export async function evaluateWithOllamaAdvanced(
  request: EvaluationRequest,
  options: EvaluationOptions = {}
): Promise<EvaluationResult> {
  const config = getEvaluationConfig();

  // Feature flag 확인
  if (!config.enabled) {
    throw new Error('RAG 평가 기능이 비활성화되어 있습니다.');
  }

  const cacheKey = generateCacheKey(request);
  const useCache = options.use_cache ?? config.cache_enabled;

  // 캐시 확인
  if (useCache) {
    const cached = getCachedEvaluation(cacheKey);
    if (cached) {
      return { ...cached, id: `eval_${Date.now()}_cached` };
    }
  }

  const startTime = Date.now();

  try {
    // 평가 프롬프트 생성
    const prompt = createEvaluationPrompt(request, config);

    // Ollama 평가 호출 (기존 ollama.ts의 evaluateWithOllama 사용)
    const ollaamaResult = await evaluateWithOllama(
      {
        question_id: `q_${Date.now()}`,
        question: request.question,
        answer: request.answer,
        retrieved_doc_ids: request.retrieved_doc_ids,
        doc_ids: request.retrieved_doc_ids
      },
      'accuracy', // 일단 accuracy로 시작하여 전체 평가 받기
      config.judge_model_name
    );

    // 결과 파싱 및 변환
    let metrics: EvaluationMetrics;

    if (ollaamaResult.details && typeof ollaamaResult.details === 'object') {
      // ollama.ts에서 받은 결과를 우리 형식으로 변환
      metrics = {
        accuracy: {
          doc_match: ollaamaResult.details.doc_match || 0,
          answer_from_retrieved: ollaamaResult.details.answer_from_retrieved || 0,
          no_hallucination: ollaamaResult.details.no_hallucination || 0,
          weighted_accuracy: ollaamaResult.score,
          weighted_score: ollaamaResult.score,
          why: ollaamaResult.details.why || {}
        },
        relevance: {
          aligns_with_intent: 1,
          topicality: 1,
          weighted_relevance: 1.0,
          weighted_score: 1.0,
          why: { aligns_with_intent: '자동 할당', topicality: '자동 할당' }
        },
        readability: {
          concise: 1,
          no_redundancy: 1,
          weighted_readability: 1.0,
          weighted_score: 1.0,
          why: { concise: '자동 할당', no_redundancy: '자동 할당' }
        },
        pii: {
          no_unnecessary_pii: 1,
          proper_masking: 1,
          weighted_privacy: 1.0,
          weighted_score: 1.0,
          why: { no_unnecessary_pii: '자동 할당', proper_masking: '자동 할당' }
        }
      };
    } else {
      // 폴백 메트릭 사용
      return createFallbackEvaluation(request, '평가 결과 파싱 실패');
    }

    const result: EvaluationResult = {
      id: `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      question: request.question,
      answer: request.answer,
      sources: request.sources?.map(s => ({
        id: s.id,
        title: s.title,
        snippet: s.content.slice(0, 100)
      })),
      retrieved_doc_ids: request.retrieved_doc_ids,
      metrics,
      overall_score: calculateOverallScore(metrics, config),
      assistant_id: request.assistant_id,
      session_id: request.session_id,
      model_name: config.judge_model_name,
      evaluation_duration: Date.now() - startTime
    };

    // 결과 저장
    saveEvaluationResult(result);

    // 캐시 저장
    if (useCache) {
      setCachedEvaluation(cacheKey, result);
    }

    return result;

  } catch (error: any) {
    console.error('평가 실패:', error);

    // 폴백 평가 결과 반환
    const fallback = createFallbackEvaluation(request, error.message);
    saveEvaluationResult(fallback);

    return fallback;
  }
}

// 설정 관리
export function getEvaluationConfig(): EvaluationConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (stored) {
      const parsed = JSON.parse(stored);

      // 레거시 호환성: 기존 model_name 필드를 judge_model_name으로 승격
      if (parsed && !parsed.judge_model_name && parsed.model_name) {
        parsed.judge_model_name = parsed.model_name;
      }

      const merged: EvaluationConfig = {
        ...DEFAULT_CONFIG,
        ...parsed
      };

      // 환경 변수에서 비활성화되어 있으면 강제 비활성화
      if (!ENV_EVALUATION_ENABLED) {
        merged.enabled = false;
      }

      // 필수 기본값 보강
      if (!merged.judge_model_name) {
        merged.judge_model_name = DEFAULT_JUDGE_MODEL;
      }
      if (!merged.rag_model_name) {
        merged.rag_model_name = DEFAULT_RAG_MODEL;
      }

      return merged;
    }
  } catch {
    // 저장된 설정 파싱 실패 시 기본값 사용
  }
  return DEFAULT_CONFIG;
}

export function setEvaluationConfig(config: Partial<EvaluationConfig>): void {
  try {
    const current = getEvaluationConfig();
    const updated = { ...current, ...config } as EvaluationConfig;

    if (!ENV_EVALUATION_ENABLED) {
      updated.enabled = false;
    }

    if (!updated.judge_model_name) {
      updated.judge_model_name = DEFAULT_JUDGE_MODEL;
    }
    if (!updated.rag_model_name) {
      updated.rag_model_name = DEFAULT_RAG_MODEL;
    }

    const { judge_model_name, rag_model_name, ...rest } = updated;
    localStorage.setItem(
      STORAGE_KEYS.CONFIG,
      JSON.stringify({
        ...rest,
        judge_model_name,
        rag_model_name
      })
    );
  } catch (error) {
    console.error('설정 저장 실패:', error);
  }
}

// 평가 결과 저장 및 조회
export function saveEvaluationResult(result: EvaluationResult): void {
  try {
    const existing = getEvaluationHistory();
    const updated = [result, ...existing].slice(0, 1000); // 최대 1000개까지만 저장
    localStorage.setItem(STORAGE_KEYS.EVALUATIONS, JSON.stringify(updated));
  } catch (error) {
    console.error('평가 결과 저장 실패:', error);
  }
}

export function getEvaluationHistory(): EvaluationResult[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.EVALUATIONS);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function clearEvaluationHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.EVALUATIONS);
    localStorage.removeItem(STORAGE_KEYS.CACHE);
  } catch (error) {
    console.error('평가 기록 삭제 실패:', error);
  }
}

// 캐시 관리
function getCachedEvaluation(key: string): EvaluationResult | null {
  try {
    const cache = JSON.parse(localStorage.getItem(STORAGE_KEYS.CACHE) || '{}');
    const cached = cache[key];
    if (cached && cached.timestamp) {
      // 24시간 캐시 유효성 검사
      const age = Date.now() - new Date(cached.timestamp).getTime();
      if (age < 24 * 60 * 60 * 1000) {
        return cached;
      }
    }
  } catch {
    // 캐시 조회 실패
  }
  return null;
}

function setCachedEvaluation(key: string, result: EvaluationResult): void {
  try {
    const cache = JSON.parse(localStorage.getItem(STORAGE_KEYS.CACHE) || '{}');
    cache[key] = result;

    // 캐시 크기 제한 (100개)
    const keys = Object.keys(cache);
    if (keys.length > 100) {
      keys.slice(100).forEach(k => delete cache[k]);
    }

    localStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(cache));
  } catch (error) {
    console.error('캐시 저장 실패:', error);
  }
}

// 통계 생성
export function generateEvaluationSummary(): EvaluationSummary {
  const history = getEvaluationHistory();

  if (history.length === 0) {
    return {
      total_evaluations: 0,
      average_score: 0,
      metrics_average: { accuracy: 0, relevance: 0, readability: 0, pii: 0 },
      trend_data: [],
      score_distribution: []
    };
  }

  // 평균 점수 계산
  const totalScore = history.reduce((sum, r) => sum + r.overall_score, 0);
  const averageScore = totalScore / history.length;

  // 메트릭별 평균
  const metricsSum = history.reduce((acc, r) => ({
    accuracy: acc.accuracy + (r.metrics.accuracy?.weighted_accuracy || 0),
    relevance: acc.relevance + (r.metrics.relevance?.weighted_relevance || 0),
    readability: acc.readability + (r.metrics.readability?.weighted_readability || 0),
    pii: acc.pii + (r.metrics.pii?.weighted_privacy || 0)
  }), { accuracy: 0, relevance: 0, readability: 0, pii: 0 });

  const metricsAverage = {
    accuracy: metricsSum.accuracy / history.length,
    relevance: metricsSum.relevance / history.length,
    readability: metricsSum.readability / history.length,
    pii: metricsSum.pii / history.length
  };

  // 트렌드 데이터 (최근 7일)
  const now = new Date();
  const trendData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayResults = history.filter(r =>
      r.timestamp.startsWith(dateStr)
    );

    trendData.push({
      date: dateStr,
      score: dayResults.length > 0
        ? dayResults.reduce((sum, r) => sum + r.overall_score, 0) / dayResults.length
        : 0,
      count: dayResults.length
    });
  }

  // 점수 분포
  const scoreDistribution = [
    { range: '0.0-0.2', count: history.filter(r => r.overall_score < 0.2).length },
    { range: '0.2-0.4', count: history.filter(r => r.overall_score >= 0.2 && r.overall_score < 0.4).length },
    { range: '0.4-0.6', count: history.filter(r => r.overall_score >= 0.4 && r.overall_score < 0.6).length },
    { range: '0.6-0.8', count: history.filter(r => r.overall_score >= 0.6 && r.overall_score < 0.8).length },
    { range: '0.8-1.0', count: history.filter(r => r.overall_score >= 0.8).length }
  ];

  return {
    total_evaluations: history.length,
    average_score: Math.round(averageScore * 1000) / 1000,
    metrics_average: {
      accuracy: Math.round(metricsAverage.accuracy * 1000) / 1000,
      relevance: Math.round(metricsAverage.relevance * 1000) / 1000,
      readability: Math.round(metricsAverage.readability * 1000) / 1000,
      pii: Math.round(metricsAverage.pii * 1000) / 1000
    },
    trend_data: trendData,
    score_distribution: scoreDistribution
  };
}

// 데이터 내보내기
export function exportEvaluationData(): string {
  const history = getEvaluationHistory();
  const summary = generateEvaluationSummary();

  const exportData = {
    export_timestamp: new Date().toISOString(),
    summary,
    evaluations: history
  };

  return JSON.stringify(exportData, null, 2);
}

// 골드 데이터셋 관련 함수들

// 골드 데이터셋 로드
export async function loadGoldDataset(datasetPath: string = '/sample_evaluation_dataset.json'): Promise<GoldDataset | null> {
  try {
    const response = await fetch(datasetPath);
    if (!response.ok) {
      console.warn(`Failed to load gold dataset from ${datasetPath}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // 배열인 경우 GoldDataset 구조로 변환
    if (Array.isArray(data)) {
      return {
        items: data,
        metadata: {
          name: 'Default Gold Dataset',
          version: '1.0',
          created_at: new Date().toISOString(),
          description: 'Loaded from public/sample_evaluation_dataset.json'
        }
      };
    }

    // 이미 GoldDataset 구조인 경우
    return data as GoldDataset;
  } catch (error) {
    console.error('Error loading gold dataset:', error);
    return null;
  }
}

// 질문과 가장 유사한 골드 데이터 아이템 찾기
export function findMatchingGoldItem(question: string, goldDataset: GoldDataset): GoldDatasetItem | null {
  if (!goldDataset?.items?.length) return null;

  const normalizedQuestion = question.toLowerCase().trim();

  // 정확한 매칭을 먼저 시도
  const exactMatch = goldDataset.items.find(item =>
    item.question.toLowerCase().trim() === normalizedQuestion
  );
  if (exactMatch) return exactMatch;

  // 키워드 매칭으로 유사도 계산
  let bestMatch: GoldDatasetItem | null = null;
  let highestScore = 0;

  for (const item of goldDataset.items) {
    let score = 0;
    const itemKeywords = [...item.on_topic_keywords, ...item.question.toLowerCase().split(' ')];

    for (const keyword of itemKeywords) {
      if (normalizedQuestion.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }

    // 유사도 정규화 (0-1)
    const normalizedScore = score / Math.max(itemKeywords.length, normalizedQuestion.split(' ').length);

    if (normalizedScore > highestScore && normalizedScore > 0.3) { // 30% 이상 유사해야 매칭
      highestScore = normalizedScore;
      bestMatch = item;
    }
  }

  return bestMatch;
}

// 골드 데이터와 비교한 평가 수행
export function compareWithGoldStandard(
  answer: string,
  goldItem: GoldDatasetItem
): {
  fact_coverage: number;
  forbidden_violations: number;
  topic_alignment: number;
  conciseness_check: number;
} {
  const normalizedAnswer = answer.toLowerCase();

  // 1. 필수 사실 포함 여부 체크
  let coveredFacts = 0;
  const totalRequiredFacts = goldItem.required_facts.filter(f => f.must).length;

  for (const fact of goldItem.required_facts) {
    if (!fact.must) continue;

    const factTexts = [fact.text, ...(fact.aliases || [])];
    const isIncluded = factTexts.some(text =>
      normalizedAnswer.includes(text.toLowerCase())
    );

    if (isIncluded) coveredFacts++;
  }

  const fact_coverage = totalRequiredFacts > 0 ? coveredFacts / totalRequiredFacts : 1;

  // 2. 금지된 주장 체크
  let violations = 0;
  for (const forbidden of goldItem.forbidden_claims) {
    const forbiddenTexts = [forbidden.text, ...(forbidden.aliases || [])];
    const hasViolation = forbiddenTexts.some(text =>
      normalizedAnswer.includes(text.toLowerCase())
    );

    if (hasViolation) violations++;
  }

  const forbidden_violations = goldItem.forbidden_claims.length > 0
    ? Math.max(0, 1 - (violations / goldItem.forbidden_claims.length))
    : 1;

  // 3. 주제 적합성 체크
  let topicMatches = 0;
  let offTopicMatches = 0;

  for (const keyword of goldItem.on_topic_keywords) {
    if (normalizedAnswer.includes(keyword.toLowerCase())) {
      topicMatches++;
    }
  }

  for (const indicator of goldItem.off_topic_indicators) {
    if (normalizedAnswer.includes(indicator.toLowerCase())) {
      offTopicMatches++;
    }
  }

  const topic_alignment = goldItem.on_topic_keywords.length > 0
    ? Math.max(0, (topicMatches / goldItem.on_topic_keywords.length) - (offTopicMatches * 0.2))
    : 1;

  // 4. 간결성 체크
  const { max_core_chars, require_tldr_or_bullets } = goldItem.concise_hint;
  const answerLength = answer.length;
  const hasBullets = /[•\-\*]\s/.test(answer) || /\d+\.\s/.test(answer);

  let conciseness_score = 1;

  if (max_core_chars > 0 && answerLength > max_core_chars * 1.5) {
    conciseness_score *= 0.7; // 너무 길면 감점
  }

  if (require_tldr_or_bullets && !hasBullets) {
    conciseness_score *= 0.8; // 불릿 포인트가 필요한데 없으면 감점
  }

  const conciseness_check = Math.max(0, Math.min(1, conciseness_score));

  return {
    fact_coverage: Math.round(fact_coverage * 1000) / 1000,
    forbidden_violations: Math.round(forbidden_violations * 1000) / 1000,
    topic_alignment: Math.round(topic_alignment * 1000) / 1000,
    conciseness_check: Math.round(conciseness_check * 1000) / 1000
  };
}

// 골드 데이터셋을 활용한 향상된 평가
export async function evaluateWithGoldStandard(
  request: EvaluationRequest,
  options: EvaluationOptions = {}
): Promise<EnhancedEvaluationResult | null> {
  // 기본 평가 수행
  const basicResult = await evaluateWithOllamaAdvanced(request, options);
  if (!basicResult) return null;

  // 골드 데이터셋 로드 및 매칭 (커스텀 데이터 우선)
  const goldDataset = await loadCustomGoldDataset();
  if (!goldDataset || !options.use_gold_dataset) {
    return basicResult as EnhancedEvaluationResult;
  }

  const matchingGoldItem = findMatchingGoldItem(request.question, goldDataset);
  if (!matchingGoldItem) {
    console.warn('No matching gold standard found for question:', request.question);
    return basicResult as EnhancedEvaluationResult;
  }

  // 골드 데이터와 비교
  const goldComparison = compareWithGoldStandard(request.answer, matchingGoldItem);

  // 결과 합성
  const enhancedResult: EnhancedEvaluationResult = {
    ...basicResult,
    gold_reference: matchingGoldItem,
    gold_comparison: goldComparison
  };

  console.log('Enhanced evaluation completed with gold standard comparison');
  return enhancedResult;
}

// 사용자 데이터셋 형식 변환 함수들

// 사용자 골드 데이터를 시스템 형식으로 변환
export function convertUserGoldDataset(userGoldData: any[]): GoldDataset {
  const convertedItems: GoldDatasetItem[] = userGoldData.map(item => ({
    question_id: item.question_id,
    question: item.question,
    answer: item.answer || '', // 테스트용 데이터에는 답변이 없을 수 있음
    retrieved_doc_ids: item.doc_ids || [], // doc_ids를 retrieved_doc_ids로 매핑
    doc_ids: item.doc_ids || [],
    required_facts: item.required_facts || [],
    forbidden_claims: item.forbidden_claims || [],
    intent_summary: item.intent_summary || '',
    on_topic_keywords: item.on_topic_keywords || [],
    off_topic_indicators: item.off_topic_indicators || [],
    concise_hint: item.concise_hint || { require_tldr_or_bullets: false, max_core_chars: 0 },
    redundancy_indicators: item.redundancy_indicators || []
  }));

  return {
    items: convertedItems,
    metadata: {
      name: 'User Custom Dataset',
      version: '1.0',
      created_at: new Date().toISOString(),
      description: 'User uploaded gold standard dataset'
    }
  };
}

// 테스트 데이터셋을 골드 데이터와 매칭하는 함수
export function matchTestWithGoldDataset(
  testData: Array<{ question_id: string; question: string }>,
  goldDataset: GoldDataset
): Array<{ test: any; gold: GoldDatasetItem | null }> {
  return testData.map(testItem => {
    const matchingGold = goldDataset.items.find(
      goldItem => goldItem.question_id === testItem.question_id
    );

    return {
      test: testItem,
      gold: matchingGold || null
    };
  });
}

// 파일 업로드 처리 함수
export async function uploadAndConvertDataset(
  file: File,
  datasetType: 'gold' | 'test'
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const text = await file.text();
    const jsonData = JSON.parse(text);

    if (!Array.isArray(jsonData)) {
      return { success: false, error: 'Dataset must be an array' };
    }

    if (datasetType === 'gold') {
      const convertedDataset = convertUserGoldDataset(jsonData);

      // 로컬스토리지에 저장
      localStorage.setItem('custom_gold_dataset', JSON.stringify(convertedDataset));

      return { success: true, data: convertedDataset };
    } else {
      // 테스트 데이터는 그대로 저장
      localStorage.setItem('custom_test_dataset', JSON.stringify(jsonData));

      return { success: true, data: jsonData };
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse ${datasetType} dataset: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// 커스텀 데이터셋 로드 (우선순위: 사용자 업로드 > 기본 샘플)
export async function loadCustomGoldDataset(): Promise<GoldDataset | null> {
  try {
    // 1. 로컬스토리지에서 사용자 업로드 데이터 확인
    const customDataset = localStorage.getItem('custom_gold_dataset');
    if (customDataset) {
      const parsed = JSON.parse(customDataset);
      console.log('Loaded custom gold dataset from localStorage');
      return parsed;
    }

    // 2. 기본 샘플 데이터 로드
    return await loadGoldDataset();
  } catch (error) {
    console.error('Error loading custom gold dataset:', error);
    return await loadGoldDataset(); // 폴백으로 기본 데이터 로드
  }
}
