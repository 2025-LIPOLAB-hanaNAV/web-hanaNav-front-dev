// RAG 품질 평가 시스템 타입 정의

export interface MetricDetail {
  [key: string]: number | Record<string, string>;
  weighted_score: number;
  why: Record<string, string>;
}

export interface AccuracyMetric extends MetricDetail {
  doc_match: number;
  answer_from_retrieved: number;
  no_hallucination: number;
  weighted_accuracy: number;
}

export interface RelevanceMetric extends MetricDetail {
  aligns_with_intent: number;
  topicality: number;
  weighted_relevance: number;
}

export interface ReadabilityMetric extends MetricDetail {
  concise: number;
  no_redundancy: number;
  weighted_readability: number;
}

export interface PIIMetric extends MetricDetail {
  no_unnecessary_pii: number;
  proper_masking: number;
  weighted_privacy: number;
}

export interface EvaluationMetrics {
  accuracy: AccuracyMetric;
  relevance: RelevanceMetric;
  readability: ReadabilityMetric;
  pii: PIIMetric;
}

export interface EvaluationResult {
  id: string;
  timestamp: string;
  question: string;
  answer: string;
  sources?: Array<{
    id: string;
    title: string;
    snippet: string;
  }>;
  retrieved_doc_ids?: string[];
  metrics: EvaluationMetrics;
  overall_score: number;
  assistant_id: string;
  session_id: string;
  model_name?: string;
  evaluation_duration?: number;
  error?: string;
}

export interface EvaluationRequest {
  question: string;
  answer: string;
  assistant_id: string;
  session_id: string;
  sources?: Array<{
    id: string;
    title: string;
    content: string;
    datasetName: string;
  }>;
  retrieved_doc_ids?: string[];
}

export interface EvaluationSummary {
  total_evaluations: number;
  average_score: number;
  metrics_average: {
    accuracy: number;
    relevance: number;
    readability: number;
    pii: number;
  };
  trend_data: Array<{
    date: string;
    score: number;
    count: number;
  }>;
  score_distribution: Array<{
    range: string;
    count: number;
  }>;
}

export interface EvaluationConfig {
  enabled: boolean;
  judge_model_name: string;
  rag_model_name: string;
  timeout_ms: number;
  cache_enabled: boolean;
  pii_masking_enabled: boolean;
  weights: {
    accuracy: number;
    relevance: number;
    readability: number;
    pii: number;
  };
}

// 로컬 스토리지 키 상수
export const STORAGE_KEYS = {
  EVALUATIONS: 'hananav_evaluations:v1',
  CONFIG: 'hananav_evaluation_config:v1',
  CACHE: 'hananav_evaluation_cache:v1'
} as const;

// 평가 상태
export type EvaluationStatus = 'pending' | 'running' | 'completed' | 'error' | 'cached';

// 평가 옵션
export interface EvaluationOptions {
  use_cache?: boolean;
  timeout_ms?: number;
  mask_pii?: boolean;
  include_sources?: boolean;
  use_gold_dataset?: boolean;
}

// 골드 데이터셋 타입 정의
export interface RequiredFact {
  label: string;
  text: string;
  must: boolean;
  aliases?: string[];
}

export interface ForbiddenClaim {
  text: string;
  aliases?: string[];
}

export interface ConciseHint {
  require_tldr_or_bullets: boolean;
  max_core_chars: number;
}

export interface GoldDatasetItem {
  question_id: string;
  question: string;
  answer: string;
  retrieved_doc_ids: string[];
  doc_ids: string[];
  required_facts: RequiredFact[];
  forbidden_claims: ForbiddenClaim[];
  intent_summary: string;
  on_topic_keywords: string[];
  off_topic_indicators: string[];
  concise_hint: ConciseHint;
  redundancy_indicators: string[];
}

export interface GoldDataset {
  items: GoldDatasetItem[];
  metadata?: {
    name: string;
    version: string;
    created_at: string;
    description?: string;
  };
}

// 골드 데이터셋과 비교한 평가 결과
export interface EnhancedEvaluationResult extends EvaluationResult {
  gold_reference?: GoldDatasetItem;
  gold_comparison?: {
    fact_coverage: number;
    forbidden_violations: number;
    topic_alignment: number;
    conciseness_check: number;
  };
}
