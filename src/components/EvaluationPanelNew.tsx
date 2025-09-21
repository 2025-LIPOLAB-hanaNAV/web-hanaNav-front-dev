import React, { useState, useRef, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Checkbox } from './ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Upload,
  Play,
  Download,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  RefreshCw
} from 'lucide-react';
import { cn } from './ui/utils';
import { batchEvaluate, EvaluationRequest, EvaluationResult, getAvailableModels } from '../services/ollama';

type MetricType = 'accuracy' | 'relevance' | 'readability' | 'privacy';

interface EvaluationStats {
  metric: string;
  avgScore: number;
  count: number;
  passRate: number;
}

export function EvaluationPanelNew() {
  // 기본 상태
  const [dataset, setDataset] = useState<EvaluationRequest[]>([]);
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<MetricType[]>(['accuracy']);
  const [evaluating, setEvaluating] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [model, setModel] = useState('llama3.2:latest');
  const [availableModels, setAvailableModels] = useState<Array<{id: string, name: string}>>([
    { id: 'llama3.2:latest', name: 'Llama 3.2' },
    { id: 'gemma2:latest', name: 'Gemma 2' },
    { id: 'phi3:latest', name: 'Phi-3' },
    { id: 'qwen2.5:latest', name: 'Qwen 2.5' }
  ]);
  const [error, setError] = useState<string | null>(null);
  const [loadingModels, setLoadingModels] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 평가 지표 정의
  const metrics = [
    { id: 'accuracy' as MetricType, name: '정확도', description: '문서 검색과 사실 정확성' },
    { id: 'relevance' as MetricType, name: '관련성', description: '질문 의도와 주제 일치성' },
    { id: 'readability' as MetricType, name: '가독성', description: '간결성과 중복 없음' },
    { id: 'privacy' as MetricType, name: '개인정보보호', description: '개인정보 노출 방지' }
  ];

  // 모델 목록 로드
  const loadAvailableModels = async () => {
    setLoadingModels(true);
    try {
      console.log('🔄 Loading available models...');
      const models = await getAvailableModels();
      if (models.length > 0) {
        setAvailableModels(models);
        // 현재 선택된 모델이 없으면 첫 번째 모델 선택
        if (!models.find(m => m.id === model)) {
          setModel(models[0].id);
        }
      }
    } catch (error) {
      console.warn('❌ Failed to load models:', error);
      setError('모델 목록을 불러올 수 없습니다. Ollama 서버 연결을 확인하세요.');
    } finally {
      setLoadingModels(false);
    }
  };

  // 컴포넌트 마운트 시 모델 로드
  useEffect(() => {
    loadAvailableModels();
  }, []);

  // 파일 업로드 처리
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        if (Array.isArray(jsonData)) {
          setDataset(jsonData);
          setResults([]);
          setError(null);
          console.log('✅ Dataset loaded:', jsonData.length, 'items');
        } else {
          setError('JSON 파일은 배열 형태여야 합니다.');
        }
      } catch (err) {
        setError('JSON 파일 파싱에 실패했습니다.');
      }
    };
    reader.readAsText(file);
  };

  // 평가 지표 토글
  const toggleMetric = (metric: MetricType) => {
    setSelectedMetrics(prev =>
      prev.includes(metric)
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    );
  };

  // 평가 실행
  const startEvaluation = async () => {
    if (dataset.length === 0) {
      setError('먼저 데이터셋을 업로드하세요.');
      return;
    }
    if (selectedMetrics.length === 0) {
      setError('최소 하나의 평가 지표를 선택하세요.');
      return;
    }

    setEvaluating(true);
    setError(null);
    setResults([]);
    setProgress({ completed: 0, total: dataset.length * selectedMetrics.length });

    try {
      console.log('🚀 평가 시작:', {
        datasetSize: dataset.length,
        metrics: selectedMetrics,
        model,
        totalEvaluations: dataset.length * selectedMetrics.length
      });

      const evaluationResults = await batchEvaluate(
        dataset,
        selectedMetrics,
        model,
        (completed, total) => {
          setProgress({ completed, total });
          console.log(`⏳ 평가 진행: ${completed}/${total} (${(completed/total*100).toFixed(1)}%)`);
        }
      );

      console.log('✅ 모든 평가 완료:', evaluationResults);
      setResults(evaluationResults);

      // 오류가 있는 평가 건 수 계산
      const errorCount = evaluationResults.filter(r => r.error).length;
      if (errorCount > 0) {
        setError(`평가 완료되었으나 ${errorCount}개 항목에서 오류가 발생했습니다.`);
      }

    } catch (err) {
      console.error('❌ 배치 평가 실패:', err);
      const errorMessage = err instanceof Error ? err.message : '평가 중 오류가 발생했습니다.';
      setError(errorMessage);
    } finally {
      setEvaluating(false);
    }
  };

  // 결과 내보내기
  const exportResults = () => {
    if (results.length === 0) return;

    const csvData = [
      ['question_id', 'metric', 'score', 'status', 'details'],
      ...results.map(r => [
        r.question_id,
        r.metric,
        r.score.toString(),
        r.error ? 'error' : 'success',
        r.error || JSON.stringify(r.details)
      ])
    ];

    const csvContent = csvData.map(row =>
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `llm_evaluation_${new Date().toISOString().slice(0, 19)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 통계 계산
  const getStats = (): EvaluationStats[] => {
    const statsByMetric = new Map<string, { scores: number[], errors: number }>();

    results.forEach(result => {
      if (!statsByMetric.has(result.metric)) {
        statsByMetric.set(result.metric, { scores: [], errors: 0 });
      }
      const stats = statsByMetric.get(result.metric)!;
      if (result.error) {
        stats.errors++;
      } else {
        stats.scores.push(result.score);
      }
    });

    return Array.from(statsByMetric.entries()).map(([metric, data]) => {
      const avgScore = data.scores.length > 0
        ? data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length
        : 0;
      const passRate = data.scores.length > 0
        ? data.scores.filter(score => score >= 0.7).length / data.scores.length * 100
        : 0;

      return {
        metric,
        avgScore,
        count: data.scores.length + data.errors,
        passRate
      };
    });
  };

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">LLM as a Judge</h2>
          <p className="text-muted-foreground">Ollama 모델을 사용한 자동 품질 평가</p>
        </div>
        <Badge variant="outline" className="gap-1">
          <BarChart3 size={14} />
          품질 평가 시스템
        </Badge>
      </div>

      <Tabs defaultValue="setup" className="space-y-4">
        <TabsList>
          <TabsTrigger value="setup">설정 및 실행</TabsTrigger>
          <TabsTrigger value="results">결과 분석</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-4">
          {/* Dataset Upload */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText size={20} />
                <h3 className="text-lg font-semibold">데이터셋 업로드</h3>
              </div>

              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="mx-auto mb-4 text-muted-foreground" size={48} />
                <p className="mb-4">JSON 평가 데이터셋을 업로드하세요</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button onClick={() => fileInputRef.current?.click()}>
                  파일 선택
                </Button>
              </div>

              {dataset.length > 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    {dataset.length}개의 평가 항목이 로드되었습니다.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </Card>

          {/* Model Selection */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">모델 선택</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadAvailableModels}
                  disabled={loadingModels}
                  className="gap-1"
                >
                  <RefreshCw className={cn("h-3 w-3", loadingModels && "animate-spin")} />
                  새로고침
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {availableModels.map(m => (
                  <Button
                    key={m.id}
                    variant={model === m.id ? "default" : "outline"}
                    onClick={() => setModel(m.id)}
                    className="justify-start text-sm"
                  >
                    {m.name}
                  </Button>
                ))}
              </div>

              <div className="text-xs text-muted-foreground">
                선택된 모델: <code className="bg-muted px-1 rounded">{model}</code>
              </div>
            </div>
          </Card>

          {/* Metrics Selection */}
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">평가 지표 선택</h3>
              <div className="grid grid-cols-2 gap-4">
                {metrics.map(metric => (
                  <div key={metric.id} className="flex items-start space-x-3">
                    <Checkbox
                      checked={selectedMetrics.includes(metric.id)}
                      onCheckedChange={() => toggleMetric(metric.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{metric.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {metric.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Run Evaluation */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">평가 실행</h3>
                <Button
                  onClick={startEvaluation}
                  disabled={evaluating || dataset.length === 0}
                  className="gap-2"
                >
                  {evaluating ? (
                    <>
                      <Clock className="animate-spin" size={16} />
                      평가 중...
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      평가 시작
                    </>
                  )}
                </Button>
              </div>

              {evaluating && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>진행 상황</span>
                    <span>{progress.completed} / {progress.total}</span>
                  </div>
                  <Progress
                    value={progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}
                  />
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {/* Results Summary */}
          {stats.length > 0 && (
            <div className="grid grid-cols-4 gap-4">
              {stats.map(stat => (
                <Card key={stat.metric} className="p-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium capitalize">{stat.metric}</div>
                    <div className="text-2xl font-bold">
                      {(stat.avgScore * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      통과율: {stat.passRate.toFixed(1)}% ({stat.count}개)
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Results Table */}
          {results.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">평가 결과</h3>
                <Button onClick={exportResults} className="gap-2">
                  <Download size={16} />
                  CSV 다운로드
                </Button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>질문 ID</TableHead>
                      <TableHead>지표</TableHead>
                      <TableHead>점수</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>세부사항</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.slice(0, 50).map((result, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-sm">
                          {result.question_id}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{result.metric}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "font-medium",
                            result.score >= 0.7 ? "text-green-600" : "text-red-600"
                          )}>
                            {(result.score * 100).toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {result.error ? (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle size={12} />
                              오류
                            </Badge>
                          ) : (
                            <Badge
                              variant={result.score >= 0.7 ? "default" : "secondary"}
                              className="gap-1"
                            >
                              <CheckCircle size={12} />
                              완료
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <details className="cursor-pointer">
                            <summary className="text-sm text-muted-foreground">
                              세부사항 보기
                            </summary>
                            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                              {result.error || JSON.stringify(result.details, null, 2)}
                            </pre>
                          </details>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {results.length > 50 && (
                <div className="mt-4 text-sm text-muted-foreground text-center">
                  처음 50개 결과만 표시됩니다. 전체 결과는 CSV로 다운로드하세요.
                </div>
              )}
            </Card>
          )}

          {results.length === 0 && (
            <Card className="p-8 text-center">
              <BarChart3 className="mx-auto mb-4 text-muted-foreground" size={48} />
              <p className="text-muted-foreground">아직 평가 결과가 없습니다.</p>
              <p className="text-sm text-muted-foreground mt-2">
                설정 탭에서 데이터셋을 업로드하고 평가를 실행하세요.
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}