import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Icon } from './ui/Icon';
import { cn } from './ui/utils';
import {
  loadCustomGoldDataset,
  uploadAndConvertDataset,
  matchTestWithGoldDataset
} from '../services/evaluation';
import type { GoldDataset, EvaluationConfig, EvaluationResult as HistoricalEvaluationResult, EvaluationSummary } from '../types/evaluation';
import type { EvaluationRequest, EvaluationResult as JudgeEvaluationResult } from '../services/ollama';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  generateEvaluationSummary,
  getEvaluationHistory,
  clearEvaluationHistory,
  exportEvaluationData,
  getEvaluationConfig,
  setEvaluationConfig,
  isEvaluationFeatureAvailable
} from '../services/evaluation';
import { batchEvaluate, getAvailableModels } from '../services/ollama';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Checkbox } from './ui/checkbox';
import { Progress } from './ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

type MetricType = 'accuracy' | 'relevance' | 'readability' | 'policy_rejection' | 'privacy_exposure';

const METRIC_OPTIONS: Array<{ id: MetricType; name: string; description: string; weight?: string }> = [
  {
    id: 'accuracy',
    name: '정확도',
    description: '문서 검색 적합성, 검색 기반 답변, 거짓 정보 여부',
    weight: 'doc_match(0.3) + answer_from_retrieved(0.5) + no_hallucination(0.2)'
  },
  {
    id: 'relevance',
    name: '관련성',
    description: '질문 의도 일치성, 상황/맥락 적합성',
    weight: 'aligns_with_intent(0.5) + topicality(0.5)'
  },
  {
    id: 'readability',
    name: '가독성',
    description: '핵심 내용 중심 답변, 중복 표현 방지',
    weight: 'concise(0.5) + no_redundancy(0.5)'
  },
  {
    id: 'policy_rejection',
    name: '정책 거절 정밀도',
    description: '거절 상황 대응, 사유 제시, 대안 절차 안내',
    weight: 'should_reject(0.6) + clear_reason(0.2) + safe_alternative(0.2)'
  },
  {
    id: 'privacy_exposure',
    name: '개인정보 노출 방지율',
    description: '불필요한 개인정보 방지, 마스킹/비식별화 처리',
    weight: 'no_unnecessary_pii(0.6) + proper_masking(0.4)'
  }
];

// 골드 데이터셋 관리 컴포넌트
function GoldDatasetManager() {
  const [goldDataset, setGoldDataset] = useState<GoldDataset | null>(null);
  const [loading, setLoading] = useState(false);
  const [testDataset, setTestDataset] = useState<Array<{ question_id: string; question: string }> | null>(null);
  const [testGoldMatches, setTestGoldMatches] = useState<Array<{ test: { question_id: string; question: string }; gold: GoldDataset['items'][number] | null }>>([]);
  const [uploadFeedback, setUploadFeedback] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);
  const [dragging, setDragging] = useState<'gold' | 'test' | null>(null);

  const goldInputRef = React.useRef<HTMLInputElement>(null);
  const testInputRef = React.useRef<HTMLInputElement>(null);

  const loadDataset = async () => {
    setLoading(true);
    try {
      const dataset = await loadCustomGoldDataset();
      setGoldDataset(dataset);
      if (typeof window !== 'undefined') {
        try {
          const storedTest = window.localStorage.getItem('custom_test_dataset');
          if (storedTest && dataset) {
            const parsed = JSON.parse(storedTest) as Array<{ question_id: string; question: string }>;
            setTestDataset(parsed);
            setTestGoldMatches(matchTestWithGoldDataset(parsed, dataset));
          } else {
            setTestDataset(null);
            setTestGoldMatches([]);
          }
        } catch (error) {
          console.warn('Failed to load stored test dataset:', error);
          setTestDataset(null);
          setTestGoldMatches([]);
        }
      }
    } catch (error) {
      console.error('Failed to load gold dataset:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDataset();
  }, []);

  const processDatasetFile = async (file: File, type: 'gold' | 'test') => {
    setLoading(true);
    setUploadFeedback(null);
    try {
      const result = await uploadAndConvertDataset(file, type);
      if (!result.success || !result.data) {
        throw new Error(result.error || '알 수 없는 오류가 발생했습니다.');
      }

      await loadDataset();

      if (type === 'gold') {
        setUploadFeedback({
          variant: 'success',
          message: '골드 데이터셋을 업데이트했습니다. 이후 평가는 새 기준을 기준으로 진행됩니다.'
        });
      } else {
        setUploadFeedback({
          variant: 'success',
          message: '테스트 데이터셋을 저장했습니다. 평가 실행 시 새 질문 세트가 사용됩니다.'
        });
      }
    } catch (error) {
      setUploadFeedback({
        variant: 'error',
        message: error instanceof Error ? error.message : `${type.toUpperCase()} 데이터셋 업로드에 실패했습니다.`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilesSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'gold' | 'test'
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      await processDatasetFile(file, type);
    }
    // 동일 파일 재업로드 가능하도록 초기화
    event.target.value = '';
  };

  const handleDrop = async (
    event: React.DragEvent<HTMLDivElement>,
    type: 'gold' | 'test'
  ) => {
    event.preventDefault();
    setDragging(null);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      await processDatasetFile(file, type);
    }
  };

  const handleDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    type: 'gold' | 'test'
  ) => {
    event.preventDefault();
    if (dragging !== type) {
      setDragging(type);
    }
  };

  const handleDragLeave = (
    event: React.DragEvent<HTMLDivElement>,
    type: 'gold' | 'test'
  ) => {
    event.preventDefault();
    if (dragging === type) {
      setDragging(null);
    }
  };

  const handleResetDatasets = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem('custom_gold_dataset');
    window.localStorage.removeItem('custom_test_dataset');
    setUploadFeedback({
      variant: 'success',
      message: '커스텀 데이터셋을 초기화했습니다. 기본 샘플이 다시 사용됩니다.'
    });
    loadDataset();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="database" size={20} />
            골드 데이터셋 관리
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => goldInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  goldInputRef.current?.click();
                }
              }}
              onDragOver={(event) => handleDragOver(event, 'gold')}
              onDragLeave={(event) => handleDragLeave(event, 'gold')}
              onDrop={(event) => handleDrop(event, 'gold')}
              className={cn(
                'border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                dragging === 'gold' ? 'border-primary bg-primary/10' : 'border-muted'
              )}
            >
              <Icon name="upload" size={20} className="mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">골드 데이터셋 업로드</p>
              <p className="text-xs text-muted-foreground mt-1">
                정답/평가 기준 JSON 파일을 드래그하거나 클릭하여 선택하세요.
              </p>
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={() => testInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  testInputRef.current?.click();
                }
              }}
              onDragOver={(event) => handleDragOver(event, 'test')}
              onDragLeave={(event) => handleDragLeave(event, 'test')}
              onDrop={(event) => handleDrop(event, 'test')}
              className={cn(
                'border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                dragging === 'test' ? 'border-primary bg-primary/10' : 'border-muted'
              )}
            >
              <Icon name="upload" size={20} className="mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">테스트 데이터셋 업로드</p>
              <p className="text-xs text-muted-foreground mt-1">
                평가할 질문 목록(JSON 배열)을 업로드하세요.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>업로드한 데이터는 브라우저 로컬스토리지에 저장됩니다.</span>
            <Button variant="ghost" size="sm" onClick={handleResetDatasets} disabled={loading}>
              초기화
            </Button>
          </div>

          <input
            ref={goldInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => handleFilesSelected(event, 'gold')}
          />
          <input
            ref={testInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => handleFilesSelected(event, 'test')}
          />

          {uploadFeedback && (
            <div
              className={cn(
                'text-xs rounded-md px-3 py-2',
                uploadFeedback.variant === 'success'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
                  : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-200'
              )}
            >
              {uploadFeedback.message}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">현재 데이터셋</h3>
              <p className="text-sm text-muted-foreground">
                {goldDataset ? `${goldDataset.items.length}개 항목` : '데이터셋이 로드되지 않음'}
              </p>
            </div>
            <Button onClick={loadDataset} disabled={loading}>
              <Icon name="refresh-cw" size={16} className="mr-2" />
              새로고침
            </Button>
          </div>

          {goldDataset && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{goldDataset.items.length}</div>
                  <div className="text-sm text-muted-foreground">총 질문</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">
                    {goldDataset.items.reduce((sum, item) => sum + item.required_facts.length, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">필수 사실</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">
                    {goldDataset.items.reduce((sum, item) => sum + item.forbidden_claims.length, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">금지 주장</div>
                </div>
              </div>

              <div className="border rounded-lg">
                <div className="p-3 border-b">
                  <h4 className="font-medium">데이터셋 미리보기</h4>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {goldDataset.items.slice(0, 5).map((item, index) => (
                    <div key={item.question_id} className="p-3 border-b last:border-b-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-blue-600">
                            {item.question_id}
                          </div>
                          <div className="text-sm mt-1 truncate">
                            {item.question}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {item.required_facts.length} 필수사실
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {item.on_topic_keywords.length} 키워드
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {goldDataset.items.length > 5 && (
                    <div className="p-3 text-center text-sm text-muted-foreground">
                      ... 및 {goldDataset.items.length - 5}개 더
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 테스트 데이터셋 정보 */}
          {testDataset && (
            <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <Icon name="beaker" size={16} className="text-blue-600" />
                <h4 className="font-medium text-blue-900 dark:text-blue-100">테스트 데이터셋</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-2 bg-white/50 dark:bg-black/20 rounded">
                  <div className="text-lg font-bold">{testDataset.length}</div>
                  <div className="text-xs text-muted-foreground">총 테스트 질문</div>
                </div>
                <div className="p-2 bg-white/50 dark:bg-black/20 rounded">
                  <div className="text-lg font-bold text-green-600">
                    {testGoldMatches.filter(m => m.gold !== null).length}
                  </div>
                  <div className="text-xs text-muted-foreground">골드 데이터 매칭</div>
                </div>
                <div className="p-2 bg-white/50 dark:bg-black/20 rounded">
                  <div className="text-lg font-bold text-orange-600">
                    {testGoldMatches.filter(m => m.gold === null).length}
                  </div>
                  <div className="text-xs text-muted-foreground">매칭 실패</div>
                </div>
              </div>

              {/* 매칭 상세 정보 */}
              {testGoldMatches.length > 0 && (
                <div className="border rounded max-h-48 overflow-y-auto">
                  <div className="p-2 bg-white/70 dark:bg-black/30 border-b">
                    <h5 className="text-sm font-medium">테스트-골드 매칭 상태</h5>
                  </div>
                  {testGoldMatches.slice(0, 10).map((match, index) => (
                    <div key={index} className="p-2 border-b last:border-b-0 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{match.test.question_id}</span>
                        <Badge
                          variant={match.gold ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {match.gold ? '매칭됨' : '매칭 실패'}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground truncate mt-1">
                        {match.test.question}
                      </div>
                    </div>
                  ))}
                  {testGoldMatches.length > 10 && (
                    <div className="p-2 text-center text-xs text-muted-foreground">
                      ... 및 {testGoldMatches.length - 10}개 더
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <details className="text-xs text-muted-foreground mt-4">
            <summary className="cursor-pointer font-medium mb-2">📋 마스터 골드 데이터셋 스키마 보기</summary>
            <div className="mt-2 p-3 bg-muted/30 rounded border">
              <pre className="text-xs whitespace-pre-wrap overflow-x-auto">
{`{
  "question_id": "Q1",
  "question": "중고거래를 통해 입금을 받았는데 계좌가 정지되었대. 지급정지를 해제할 수 있어?",

  "gold_doc_ids": ["명의인의 이의제기"],

  "required_facts": [
    {
      "label": "evidence_listing",
      "text": "본인 계정 판매 게시글 제출",
      "must": true,
      "aliases": ["판매글", "판매 게시글 사본"]
    }
  ],

  "forbidden_claims": [
    {"text": "증빙 없이 즉시 해제 가능"}
  ],

  "intent_summary": "중고거래 입금으로 지급정지된 계좌의 해제 가능 여부와 이의제기 절차/증빙 안내",
  "on_topic_keywords": ["지급정지 해제 절차", "이의제기", "증빙 제출"],
  "off_topic_indicators": ["대출", "연차", "해외송금 수수료"],

  "concise_hint": {
    "require_tldr_or_bullets": true,
    "max_core_chars": 400
  },
  "redundancy_indicators": ["같은 문구 재언급"]
}`}
              </pre>
            </div>
            <div className="mt-2 text-xs space-y-1">
              <p><strong>🎯 은행 QA 특화 스키마:</strong></p>
              <p>• <code>required_facts</code>: must=true인 필수 사실, aliases 지원</p>
              <p>• <code>forbidden_claims</code>: 답변에 나오면 안 되는 잘못된 주장</p>
              <p>• <code>intent_summary</code>: 질문 의도 요약 (관련성 평가용)</p>
              <p>• <code>concise_hint</code>: 간결성 평가 기준</p>
              <p>• <code>gold_doc_ids</code>: 정확한 검색 문서 (정확도 평가용)</p>
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}

export function EvaluationDashboard() {
  const [summary, setSummary] = useState<EvaluationSummary | null>(null);
  const [history, setHistory] = useState<HistoricalEvaluationResult[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState<HistoricalEvaluationResult | null>(null);
  const [showPIIData, setShowPIIData] = useState(false);
  const [config, setConfig] = useState(getEvaluationConfig());
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string }>>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  const featureAvailable = isEvaluationFeatureAvailable();

  const [runnerDataset, setRunnerDataset] = useState<EvaluationRequest[]>(() => {
    try {
      const stored = localStorage.getItem('hananav_evaluation_runner_dataset');
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.warn('Failed to restore evaluation runner dataset:', error);
    }
    return [];
  });
  const [runnerResults, setRunnerResults] = useState<JudgeEvaluationResult[]>([]);
  const [runnerDatasetName, setRunnerDatasetName] = useState<string>(() => {
    try {
      return localStorage.getItem('hananav_evaluation_runner_dataset_name') || '';
    } catch {
      return '';
    }
  });
  const [selectedMetrics, setSelectedMetrics] = useState<MetricType[]>(['accuracy', 'relevance', 'readability', 'policy_rejection', 'privacy_exposure']);
  const [evaluating, setEvaluating] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [runnerError, setRunnerError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const goldFileInputRef = useRef<HTMLInputElement>(null);
  const [goldDatasetStatus, setGoldDatasetStatus] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  const applyConfig = (partial: Partial<EvaluationConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial } as EvaluationConfig;
      setEvaluationConfig(partial);
      return next;
    });
  };

  useEffect(() => {
    try {
      localStorage.setItem('hananav_evaluation_runner_dataset', JSON.stringify(runnerDataset));
    } catch (error) {
      console.warn('Failed to persist evaluation runner dataset:', error);
    }
  }, [runnerDataset]);

  useEffect(() => {
    try {
      if (runnerDatasetName) {
        localStorage.setItem('hananav_evaluation_runner_dataset_name', runnerDatasetName);
      } else {
        localStorage.removeItem('hananav_evaluation_runner_dataset_name');
      }
    } catch (error) {
      console.warn('Failed to persist evaluation runner dataset name:', error);
    }
  }, [runnerDatasetName]);

  // 데이터 로드
  const loadData = () => {
    const summaryData = generateEvaluationSummary();
    const historyData = getEvaluationHistory();
    setSummary(summaryData);
    setHistory(historyData);
  };

  useEffect(() => {
    loadData();
    // 주기적으로 데이터 새로고침 (새 평가가 있을 때)
    const interval = setInterval(loadData, 30000); // 30초마다
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchModels = async () => {
      setModelsLoading(true);
      try {
        const models = await getAvailableModels();
        if (!cancelled) {
          setAvailableModels(models);
        }
      } finally {
        if (!cancelled) {
          setModelsLoading(false);
        }
      }
    };

    fetchModels();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleConfigToggle = (key: 'enabled' | 'pii_masking_enabled' | 'cache_enabled') => (checked: boolean) => {
    applyConfig({ [key]: checked } as Partial<EvaluationConfig>);
  };

  const handleModelSelect = (key: 'rag_model_name' | 'judge_model_name') => (value: string) => {
    applyConfig({ [key]: value } as Partial<EvaluationConfig>);
  };

  const modelOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: Array<{ id: string; name: string }> = [];

    const addOption = (option?: { id: string; name: string } | null) => {
      if (!option || !option.id) return;
      if (seen.has(option.id)) return;
      options.push({ id: option.id, name: option.name || option.id });
      seen.add(option.id);
    };

    availableModels.forEach(addOption);
    addOption({ id: config.rag_model_name, name: config.rag_model_name });
    addOption({ id: config.judge_model_name, name: config.judge_model_name });

    return options;
  }, [availableModels, config.rag_model_name, config.judge_model_name]);

  const handleRunnerFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = e.target?.result;
        if (!raw || typeof raw !== 'string') {
          throw new Error('파일을 읽을 수 없습니다.');
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          throw new Error('JSON 파일은 배열 형태여야 합니다.');
        }
        setRunnerDataset(parsed as EvaluationRequest[]);
        setRunnerDatasetName(file.name);
        setRunnerResults([]);
        setRunnerError(null);
      } catch (error) {
        console.error('Failed to load evaluation dataset:', error);
        setRunnerError(error instanceof Error ? error.message : '데이터셋을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const clearRunnerDataset = () => {
    setRunnerDataset([]);
    setRunnerDatasetName('');
    setRunnerResults([]);
  };

  const handleGoldFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setGoldDatasetStatus(null);

    try {
      const { uploadAndConvertDataset } = await import('../services/evaluation');
      const result = await uploadAndConvertDataset(file, 'gold');

      if (result.success) {
        setGoldDatasetStatus({
          variant: 'success',
          message: `골드 데이터셋 업로드 완료: ${result.data?.items?.length || 0}개 평가 기준`
        });
      } else {
        setGoldDatasetStatus({
          variant: 'error',
          message: result.error || '골드 데이터셋 업로드 실패'
        });
      }
    } catch (error) {
      setGoldDatasetStatus({
        variant: 'error',
        message: error instanceof Error ? error.message : '골드 데이터셋 업로드 중 오류 발생'
      });
    }

    // 파일 입력 초기화
    event.target.value = '';
  };

  const clearGoldDataset = () => {
    try {
      localStorage.removeItem('custom_gold_dataset');
      setGoldDatasetStatus({
        variant: 'success',
        message: '골드 데이터셋이 기본값으로 초기화되었습니다.'
      });
    } catch (error) {
      setGoldDatasetStatus({
        variant: 'error',
        message: '초기화 중 오류가 발생했습니다.'
      });
    }
  };

  const toggleMetric = (metric: MetricType) => {
    setSelectedMetrics((prev) =>
      prev.includes(metric) ? prev.filter((item) => item !== metric) : [...prev, metric]
    );
  };

  const startRunnerEvaluation = async () => {
    if (runnerDataset.length === 0) {
      setRunnerError('먼저 평가할 데이터셋을 업로드하세요.');
      return;
    }
    if (selectedMetrics.length === 0) {
      setRunnerError('최소 하나 이상의 평가 지표를 선택하세요.');
      return;
    }

    setEvaluating(true);
    setRunnerError(null);
    setProgress({ completed: 0, total: runnerDataset.length * selectedMetrics.length });
    setRunnerResults([]);

    try {
      const results = await batchEvaluate(
        runnerDataset,
        selectedMetrics,
        config.judge_model_name,
        (completed, total) => setProgress({ completed, total })
      );
      setRunnerResults(results);
      const failed = results.filter((result) => result.error).length;
      if (failed > 0) {
        setRunnerError(`평가 완료 (오류 ${failed}건 발생)`);
      }
    } catch (error) {
      console.error('Batch evaluation failed:', error);
      setRunnerError(error instanceof Error ? error.message : '평가 중 오류가 발생했습니다.');
    } finally {
      setEvaluating(false);
    }
  };

  const exportRunnerResults = () => {
    if (runnerResults.length === 0) return;

    const csvRows = [
      ['question_id', 'metric', 'score', 'status', 'details'],
      ...runnerResults.map((result) => [
        result.question_id,
        result.metric,
        result.score.toString(),
        result.error ? 'error' : 'success',
        result.error || JSON.stringify(result.details)
      ])
    ];

    const csvContent = csvRows.map((row) => row.map((cell) => `"${cell ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `hananav_evaluation_${new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const runnerStats = useMemo(() => {
    if (runnerResults.length === 0) return [] as Array<{ metric: string; avg: number; count: number; pass: number }>;
    const grouped = new Map<string, { scores: number[]; total: number; passes: number }>();
    runnerResults.forEach((result) => {
      if (!grouped.has(result.metric)) {
        grouped.set(result.metric, { scores: [], total: 0, passes: 0 });
      }
      const bucket = grouped.get(result.metric)!;
      bucket.total += 1;
      if (!result.error) {
        bucket.scores.push(result.score);
        if (result.score >= 0.7) bucket.passes += 1;
      }
    });
    return Array.from(grouped.entries()).map(([metric, data]) => {
      const avg = data.scores.length > 0 ? data.scores.reduce((sum, value) => sum + value, 0) / data.scores.length : 0;
      return {
        metric,
        avg,
        count: data.total,
        pass: data.total > 0 ? (data.passes / data.total) * 100 : 0
      };
    });
  }, [runnerResults]);

  const datasetPreview = useMemo(() => runnerDataset.slice(0, 5), [runnerDataset]);


  // 데이터 내보내기
  const handleExport = () => {
    const data = exportEvaluationData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hananav_evaluations_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 히스토리 삭제
  const handleClearHistory = () => {
    if (window.confirm('모든 평가 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      clearEvaluationHistory();
      loadData();
    }
  };

  // 스코어 색상
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  // 차트 색상
  const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  // 메트릭 카드 컴포넌트
  const MetricCard = ({ title, value, description, color = 'text-foreground' }: {
    title: string;
    value: string | number;
    description?: string;
    color?: string;
  }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn("text-2xl font-bold", color)}>{value}</p>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Feature flag 확인 (환경 변수 기준)
  if (!featureAvailable) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Icon name="target" size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">RAG 평가 기능 비활성화</h3>
            <p className="text-muted-foreground mb-4">
              RAG 평가 기능이 현재 비활성화되어 있습니다. 환경 변수 설정을 확인해주세요.
            </p>
            <p className="text-xs text-muted-foreground">
              VITE_ENABLE_RAG_EVALUATION=true
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">RAG 품질 평가</h1>
          <p className="text-muted-foreground">
            AI 응답 품질을 모니터링하고 개선하세요
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData}>
            <Icon name="refresh-cw" size={16} className="mr-2" />
            새로고침
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Icon name="download" size={16} className="mr-2" />
            내보내기
          </Button>
          {history.length > 0 && (
            <Button variant="destructive" onClick={handleClearHistory}>
              <Icon name="trash" size={16} className="mr-2" />
              기록 삭제
            </Button>
          )}
        </div>
      </div>

      {!config.enabled && (
        <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-900/40 dark:bg-yellow-900/20">
          <AlertDescription>
            자동 평가가 비활성화된 상태입니다. 아래 설정에서 “자동 평가 사용”을 켜면 챗봇 응답에 대한 Judge 평가가 다시 수행됩니다.
          </AlertDescription>
        </Alert>
      )}

      {/* 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="settings" size={20} />
            설정
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">자동 평가 사용</span>
              <Switch
                checked={config.enabled}
                onCheckedChange={handleConfigToggle('enabled')}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">PII 마스킹</span>
              <Switch
                checked={config.pii_masking_enabled}
                onCheckedChange={handleConfigToggle('pii_masking_enabled')}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">캐시 사용</span>
              <Switch
                checked={config.cache_enabled}
                onCheckedChange={handleConfigToggle('cache_enabled')}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">민감정보 표시</span>
              <Switch
                checked={showPIIData}
                onCheckedChange={setShowPIIData}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="space-y-2">
              <span className="text-sm font-medium">RAG 생성 모델</span>
              <Select
                value={config.rag_model_name}
                onValueChange={handleModelSelect('rag_model_name')}
                disabled={modelsLoading && modelOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={modelsLoading ? '모델 목록을 불러오는 중...' : '모델을 선택하세요'} />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Judge 평가 모델</span>
              <Select
                value={config.judge_model_name}
                onValueChange={handleModelSelect('judge_model_name')}
                disabled={modelsLoading && modelOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={modelsLoading ? '모델 목록을 불러오는 중...' : '모델을 선택하세요'} />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map((model) => (
                    <SelectItem key={`${model.id}-judge`} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {modelsLoading && (
            <p className="mt-2 text-xs text-muted-foreground">모델 목록을 불러오는 중입니다…</p>
          )}
        </CardContent>
      </Card>

      {/* Batch evaluation runner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="play" size={20} />
            배치 평가 실행
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="setup" className="space-y-4">
            <TabsList>
              <TabsTrigger value="setup">데이터셋 & 지표 설정</TabsTrigger>
              <TabsTrigger value="results" disabled={runnerResults.length === 0}>
                결과 보기
              </TabsTrigger>
            </TabsList>

            <TabsContent value="setup" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Icon name="file-text" size={16} />
                      평가 데이터셋 업로드
                    </h3>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <Icon name="upload" size={28} className="mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-3">
                        질문 배열을 업로드하면 RAG가 답변을 생성하고 Judge가 품질을 평가합니다.
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                          파일 선택
                        </Button>
                        {runnerDataset.length > 0 && (
                          <Button variant="ghost" size="sm" onClick={clearRunnerDataset}>
                            초기화
                          </Button>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/json"
                        className="hidden"
                        onChange={handleRunnerFileUpload}
                      />
                    </div>

                    <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-900/20">
                      <Icon name="info" size={16} className="text-blue-600" />
                      <AlertDescription className="text-sm">
                        <strong>📋 배치 평가 작동 방식</strong><br/>
                        <div className="mt-2 space-y-2">
                          <div className="font-medium text-blue-700">🔄 자동 처리 과정:</div>
                          <div className="ml-4 text-xs space-y-1">
                            1. <strong>질문 배열 업로드</strong> → 단순 질문 목록만 있어도 OK<br/>
                            2. <strong>RAG 답변 생성</strong> → 답변이 없으면 자동으로 RAG가 생성<br/>
                            3. <strong>Judge 평가</strong> → 골드 데이터 기준으로 품질 점수 계산<br/>
                            4. <strong>결과 표시</strong> → 대시보드에 평가 결과 출력
                          </div>

                          <div className="font-medium text-green-700">✅ 업로드 가능한 형태:</div>
                          <div className="ml-4 text-xs space-y-1">
                            • <code>[{`{"question_id":"Q1", "question":"질문내용"}`}]</code><br/>
                            • <code>[{`{"question_id":"Q1", "question":"질문", "answer":"답변"}`}]</code><br/>
                            • 골드 표준 형식 (required_facts, forbidden_claims 포함)
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">로드된 항목</span>
                      <span className="font-medium">{runnerDataset.length}개</span>
                    </div>
                    {runnerDatasetName && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">파일명</span>
                        <span className="font-medium truncate max-w-[200px]" title={runnerDatasetName}>
                          {runnerDatasetName}
                        </span>
                      </div>
                    )}
                    {datasetPreview.length > 0 && (
                      <div className="border rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                        <div className="font-semibold text-foreground flex items-center gap-1">
                          <Icon name="list" size={12} /> 미리보기
                        </div>
                        {datasetPreview.map((item, index) => (
                          <div key={`${item.question_id}-${index}`} className="truncate">
                            <span className="font-mono mr-2">{item.question_id || `item-${index + 1}`}</span>
                            {item.question}
                          </div>
                        ))}
                        {runnerDataset.length > datasetPreview.length && (
                          <div className="text-muted-foreground">... 등 {runnerDataset.length - datasetPreview.length}개</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Icon name="database" size={16} />
                      골드 데이터셋 업로드
                    </h3>
                    <div className="border-2 border-dashed border-amber-300 rounded-lg p-6 text-center bg-amber-50 dark:bg-amber-950/20">
                      <Icon name="star" size={28} className="mx-auto mb-2 text-amber-600" />
                      <p className="text-sm text-muted-foreground mb-3">
                        평가 기준 골드 데이터 (required_facts, forbidden_claims)를 업로드하세요.
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button variant="outline" size="sm" onClick={() => goldFileInputRef.current?.click()}>
                          골드 데이터 선택
                        </Button>
                        <Button variant="ghost" size="sm" onClick={clearGoldDataset}>
                          기본값으로 초기화
                        </Button>
                      </div>
                      <input
                        ref={goldFileInputRef}
                        type="file"
                        accept="application/json"
                        className="hidden"
                        onChange={handleGoldFileUpload}
                      />
                    </div>

                    <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20">
                      <Icon name="lightbulb" size={16} className="text-amber-600" />
                      <AlertDescription className="text-sm">
                        <strong>💡 골드 데이터셋이란?</strong><br/>
                        <div className="mt-2 text-xs space-y-1">
                          • Judge 모델이 답변 품질을 평가할 때 사용하는 <strong>정답 기준</strong><br/>
                          • 각 질문별로 <code>required_facts</code>(필수 포함 사실), <code>forbidden_claims</code>(금지 주장) 정의<br/>
                          • 업로드하지 않으면 기본 샘플 데이터가 사용됩니다
                        </div>
                      </AlertDescription>
                    </Alert>

                    {goldDatasetStatus && (
                      <div
                        className={cn(
                          'text-xs rounded-md px-3 py-2',
                          goldDatasetStatus.variant === 'success'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
                            : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-200'
                        )}
                      >
                        {goldDatasetStatus.message}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Icon name="cpu" size={16} /> 평가 모델
                    </h3>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm font-medium">{config.judge_model_name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        현재 설정된 Judge 평가 모델을 사용합니다. 변경은 상단 설정에서 가능합니다.
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Icon name="settings" size={16} /> 평가 지표 선택
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {METRIC_OPTIONS.map((metric) => (
                        <label key={metric.id} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                          <Checkbox
                            checked={selectedMetrics.includes(metric.id)}
                            onCheckedChange={() => toggleMetric(metric.id)}
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium">{metric.name}</div>
                            <div className="text-xs text-muted-foreground mb-1">{metric.description}</div>
                            {metric.weight && (
                              <div className="text-xs text-blue-600 font-mono bg-blue-50 dark:bg-blue-950/20 px-2 py-1 rounded">
                                {metric.weight}
                              </div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Icon name="play" size={16} className="text-blue-600" />
                      평가 실행
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      선택된 지표로 {runnerDataset.length}개 항목을 평가합니다.
                    </p>
                  </div>
                  <Button
                    onClick={startRunnerEvaluation}
                    disabled={evaluating || runnerDataset.length === 0 || selectedMetrics.length === 0}
                    className="gap-2"
                  >
                    {evaluating ? (
                      <>
                        <Icon name="loader" size={14} className="animate-spin" />
                        평가 중...
                      </>
                    ) : (
                      <>
                        <Icon name="play" size={14} />
                        평가 시작
                      </>
                    )}
                  </Button>
                </div>

                {evaluating && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>진행도</span>
                      <span>{progress.completed} / {progress.total}</span>
                    </div>
                    <Progress value={progress.total > 0 ? (progress.completed / progress.total) * 100 : 0} className="h-2" />
                  </div>
                )}

                {runnerError && (
                  <Alert variant={evaluating ? 'default' : 'destructive'}>
                    <AlertDescription>{runnerError}</AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>

            <TabsContent value="results" className="space-y-4">
              {runnerResults.length > 0 ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {runnerStats.map((stat) => (
                      <Card key={`runner-stat-${stat.metric}`} className="p-4 hover:shadow-md transition-shadow">
                        <div className="space-y-1">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                            {METRIC_OPTIONS.find(m => m.id === stat.metric)?.name || stat.metric}
                          </div>
                          <div className={cn(
                            "text-2xl font-semibold",
                            stat.avg >= 0.8 ? "text-green-600" : stat.avg >= 0.6 ? "text-yellow-600" : "text-red-600"
                          )}>
                            {(stat.avg * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            통과율 {(stat.pass).toFixed(1)}% • {stat.count}건
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  <Card>
                    <CardHeader className="flex-row items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Icon name="table" size={20} />
                        세부 결과
                      </CardTitle>
                      <Button size="sm" variant="outline" className="gap-2" onClick={exportRunnerResults}>
                        <Icon name="download" size={14} /> CSV 내보내기
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>질문 ID</TableHead>
                              <TableHead>평가 지표</TableHead>
                              <TableHead>점수</TableHead>
                              <TableHead>상태</TableHead>
                              <TableHead className="min-w-[240px]">세부 내용</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {runnerResults.slice(0, 100).map((result, index) => (
                              <TableRow key={`runner-result-${index}`} className="hover:bg-muted/50">
                                <TableCell className="font-mono text-xs">
                                  {result.question_id || '-'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="capitalize">
                                    {METRIC_OPTIONS.find(m => m.id === result.metric)?.name || result.metric}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <span className={cn(
                                    'text-sm font-semibold',
                                    result.score >= 0.8 ? 'text-green-600' : result.score >= 0.6 ? 'text-yellow-600' : 'text-red-600'
                                  )}>
                                    {(result.score * 100).toFixed(1)}%
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {result.error ? (
                                    <Badge variant="destructive">오류</Badge>
                                  ) : (
                                    <Badge variant="default">완료</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <details className="text-xs">
                                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">세부 정보</summary>
                                    <pre className="mt-2 bg-muted p-2 rounded max-h-48 overflow-auto text-xs whitespace-pre-wrap">
                                      {result.error || JSON.stringify(result.details, null, 2)}
                                    </pre>
                                  </details>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {runnerResults.length > 100 && (
                        <p className="mt-3 text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded">
                          ⚠️ 처음 100개의 결과만 표시됩니다. 전체 데이터는 CSV로 내려받으세요.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="border border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground">
                  <Icon name="bar-chart" size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="font-medium mb-2">평가 데이터 없음</h3>
                  <p>아직 실행된 평가가 없습니다. 채팅에서 AI 응답에 대한 평가를 시작해보세요.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {summary.total_evaluations > 0 && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="trends">트렌드</TabsTrigger>
            <TabsTrigger value="history">기록</TabsTrigger>
            <TabsTrigger value="details">상세분석</TabsTrigger>
            <TabsTrigger value="datasets">데이터셋</TabsTrigger>
          </TabsList>

          {/* 개요 탭 */}
          <TabsContent value="overview" className="space-y-6">
            {/* 주요 지표 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="전체 평가"
                value={summary.total_evaluations}
                description="누적 평가 수"
              />
              <MetricCard
                title="평균 점수"
                value={`${Math.round(summary.average_score * 100)}점`}
                color={getScoreColor(summary.average_score)}
                description="전체 평균"
              />
              <MetricCard
                title="정확도"
                value={`${Math.round(summary.metrics_average.accuracy * 100)}%`}
                color={getScoreColor(summary.metrics_average.accuracy)}
                description="평균 정확도"
              />
              <MetricCard
                title="관련성"
                value={`${Math.round(summary.metrics_average.relevance * 100)}%`}
                color={getScoreColor(summary.metrics_average.relevance)}
                description="평균 관련성"
              />
            </div>

            {/* 점수 분포 */}
            <Card>
              <CardHeader>
                <CardTitle>점수 분포</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={summary.score_distribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 메트릭별 평균 */}
            <Card>
              <CardHeader>
                <CardTitle>메트릭별 성능</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(summary.metrics_average.accuracy * 100)}%
                    </div>
                    <div className="text-sm text-muted-foreground">정확도 (40%)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round(summary.metrics_average.relevance * 100)}%
                    </div>
                    <div className="text-sm text-muted-foreground">관련성 (25%)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round(summary.metrics_average.readability * 100)}%
                    </div>
                    <div className="text-sm text-muted-foreground">가독성 (25%)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {Math.round(summary.metrics_average.pii * 100)}%
                    </div>
                    <div className="text-sm text-muted-foreground">개인정보 (10%)</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 트렌드 탭 */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>최근 7일 트렌드</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={summary.trend_data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 1]} />
                    <Tooltip
                      formatter={(value: number) => [`${Math.round(value * 100)}점`, '평균 점수']}
                      labelFormatter={(label) => `날짜: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 기록 탭 */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>평가 기록</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-auto">
                  {history.slice(0, 50).map((evaluation) => (
                    <div
                      key={evaluation.id}
                      className="p-3 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedEvaluation(evaluation)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {showPIIData ? evaluation.question : evaluation.question.slice(0, 50) + '...'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(evaluation.timestamp).toLocaleString('ko-KR')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={evaluation.overall_score >= 0.8 ? 'default' : evaluation.overall_score >= 0.6 ? 'secondary' : 'destructive'}>
                            {Math.round(evaluation.overall_score * 100)}점
                          </Badge>
                          {evaluation.error && (
                            <Icon name="alert-triangle" size={14} className="text-destructive" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 상세분석 탭 */}
          <TabsContent value="details" className="space-y-6">
            {selectedEvaluation ? (
              <Card>
                <CardHeader>
                  <CardTitle>평가 상세</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">질문</h4>
                    <p className="text-sm text-muted-foreground p-2 bg-muted rounded">
                      {showPIIData ? selectedEvaluation.question : selectedEvaluation.question}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">답변</h4>
                    <p className="text-sm text-muted-foreground p-2 bg-muted rounded max-h-32 overflow-auto">
                      {showPIIData ? selectedEvaluation.answer : selectedEvaluation.answer}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <h5 className="font-medium text-sm">정확도</h5>
                      <p className="text-lg font-bold text-green-600">
                        {Math.round(selectedEvaluation.metrics.accuracy.weighted_accuracy * 100)}%
                      </p>
                    </div>
                    <div>
                      <h5 className="font-medium text-sm">관련성</h5>
                      <p className="text-lg font-bold text-blue-600">
                        {Math.round(selectedEvaluation.metrics.relevance.weighted_relevance * 100)}%
                      </p>
                    </div>
                    <div>
                      <h5 className="font-medium text-sm">가독성</h5>
                      <p className="text-lg font-bold text-purple-600">
                        {Math.round(selectedEvaluation.metrics.readability.weighted_readability * 100)}%
                      </p>
                    </div>
                    <div>
                      <h5 className="font-medium text-sm">개인정보</h5>
                      <p className="text-lg font-bold text-orange-600">
                        {Math.round(selectedEvaluation.metrics.pii.weighted_privacy * 100)}%
                      </p>
                    </div>
                  </div>
                  {selectedEvaluation.sources && selectedEvaluation.sources.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">참조 문서</h4>
                      <div className="space-y-1">
                        {selectedEvaluation.sources.map((source, index) => (
                          <div key={source.id} className="text-xs p-2 bg-muted rounded">
                            <span className="font-medium">[{index + 1}]</span> {source.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Icon name="mouse-pointer-click" size={48} className="mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">평가 선택</h3>
                  <p className="text-muted-foreground">
                    기록 탭에서 평가를 선택하면 상세 정보를 확인할 수 있습니다.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 데이터셋 관리 탭 */}
          <TabsContent value="datasets" className="space-y-6">
            <GoldDatasetManager />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
