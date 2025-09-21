import React, { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Progress } from './ui/progress';
import { Icon } from './ui/Icon';
import { cn } from './ui/utils';
import { evaluateWithOllamaAdvanced, evaluateWithGoldStandard, getEvaluationConfig, isEvaluationFeatureAvailable } from '../services/evaluation';
import type { EvaluationResult, EvaluationRequest, EnhancedEvaluationResult } from '../types/evaluation';

interface EvaluationWidgetProps {
  question: string;
  answer: string;
  assistantId: string;
  sessionId: string;
  sources?: Array<{
    id: string;
    title: string;
    content: string;
    datasetName: string;
  }>;
  retrievedDocIds?: string[];
  onEvaluationResult?: (result: EvaluationResult) => void;
  className?: string;
}

export function EvaluationWidget({
  question,
  answer,
  assistantId,
  sessionId,
  sources,
  retrievedDocIds,
  onEvaluationResult,
  className
}: EvaluationWidgetProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'completed' | 'error'>('idle');
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = getEvaluationConfig();
  const featureAvailable = isEvaluationFeatureAvailable();

  // Feature flag 확인
  if (!featureAvailable || !config.enabled) {
    return null;
  }

  const handleEvaluate = async () => {
    if (status === 'loading') return;

    setStatus('loading');
    setError(null);

    try {
      const request: EvaluationRequest = {
        question,
        answer,
        assistant_id: assistantId,
        session_id: sessionId,
        sources,
        retrieved_doc_ids: retrievedDocIds
      };

      const evaluationResult = await evaluateWithGoldStandard(request, {
        use_cache: true,
        timeout_ms: config.timeout_ms,
        mask_pii: config.pii_masking_enabled,
        use_gold_dataset: true
      });

      setResult(evaluationResult);
      setStatus('completed');
      setIsExpanded(true);
      onEvaluationResult?.(evaluationResult);

    } catch (err: any) {
      console.error('평가 실패:', err);
      setError(err.message || '평가 중 오류가 발생했습니다.');
      setStatus('error');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 0.8) return 'default';
    if (score >= 0.6) return 'secondary';
    return 'destructive';
  };

  const formatScore = (score: number) => {
    return Math.round(score * 100);
  };

  return (
    <Card className={cn("mt-3 border-muted", className)}>
      <div className="p-3">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="target" size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              답변 품질 평가
            </span>
            {result && (
              <Badge variant={getScoreBadgeVariant(result.overall_score)} className="text-xs">
                {formatScore(result.overall_score)}점
              </Badge>
            )}
          </div>

          {status === 'idle' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEvaluate}
              className="h-7 px-2 text-xs"
            >
              <Icon name="zap" size={12} className="mr-1" />
              평가하기
            </Button>
          )}

          {status === 'loading' && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              평가 중...
            </div>
          )}

          {status === 'completed' && result && (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                  <Icon name={isExpanded ? "chevron-up" : "chevron-down"} size={12} />
                  상세보기
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          )}

          {status === 'error' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEvaluate}
              className="h-7 px-2 text-xs text-destructive"
            >
              <Icon name="refresh-cw" size={12} className="mr-1" />
              재시도
            </Button>
          )}
        </div>

        {/* 에러 메시지 */}
        {status === 'error' && error && (
          <div className="mt-2 text-xs text-destructive">
            <Icon name="alert-circle" size={12} className="inline mr-1" />
            {error}
          </div>
        )}

        {/* 간단한 결과 (접혀있을 때) */}
        {status === 'completed' && result && !isExpanded && (
          <div className="mt-2 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <Icon name="check-circle" size={12} className="text-green-600" />
              <span className="text-muted-foreground">정확도</span>
              <span className={getScoreColor(result.metrics.accuracy.weighted_accuracy)}>
                {formatScore(result.metrics.accuracy.weighted_accuracy)}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Icon name="target" size={12} className="text-blue-600" />
              <span className="text-muted-foreground">관련성</span>
              <span className={getScoreColor(result.metrics.relevance.weighted_relevance)}>
                {formatScore(result.metrics.relevance.weighted_relevance)}%
              </span>
            </div>
          </div>
        )}

        {/* 상세 결과 */}
        {status === 'completed' && result && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleContent className="mt-3">
              <div className="space-y-3">
                {/* 전체 점수 */}
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-sm font-medium">전체 점수</span>
                  <div className="flex items-center gap-2">
                    <Progress value={result.overall_score * 100} className="w-16 h-2" />
                    <span className={cn("text-sm font-bold", getScoreColor(result.overall_score))}>
                      {formatScore(result.overall_score)}점
                    </span>
                  </div>
                </div>

                {/* 메트릭별 상세 */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* 정확도 */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Icon name="check-circle" size={12} className="text-green-600" />
                      <span className="font-medium">정확도 (40%)</span>
                    </div>
                    <Progress
                      value={result.metrics.accuracy.weighted_accuracy * 100}
                      className="h-1"
                    />
                    <span className={getScoreColor(result.metrics.accuracy.weighted_accuracy)}>
                      {formatScore(result.metrics.accuracy.weighted_accuracy)}%
                    </span>
                  </div>

                  {/* 관련성 */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Icon name="target" size={12} className="text-blue-600" />
                      <span className="font-medium">관련성 (25%)</span>
                    </div>
                    <Progress
                      value={result.metrics.relevance.weighted_relevance * 100}
                      className="h-1"
                    />
                    <span className={getScoreColor(result.metrics.relevance.weighted_relevance)}>
                      {formatScore(result.metrics.relevance.weighted_relevance)}%
                    </span>
                  </div>

                  {/* 가독성 */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Icon name="eye" size={12} className="text-purple-600" />
                      <span className="font-medium">가독성 (25%)</span>
                    </div>
                    <Progress
                      value={result.metrics.readability.weighted_readability * 100}
                      className="h-1"
                    />
                    <span className={getScoreColor(result.metrics.readability.weighted_readability)}>
                      {formatScore(result.metrics.readability.weighted_readability)}%
                    </span>
                  </div>

                  {/* 개인정보 보호 */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Icon name="shield" size={12} className="text-orange-600" />
                      <span className="font-medium">개인정보 (10%)</span>
                    </div>
                    <Progress
                      value={result.metrics.pii.weighted_privacy * 100}
                      className="h-1"
                    />
                    <span className={getScoreColor(result.metrics.pii.weighted_privacy)}>
                      {formatScore(result.metrics.pii.weighted_privacy)}%
                    </span>
                  </div>
                </div>

                {/* 골드 데이터셋 비교 결과 */}
                {(result as EnhancedEvaluationResult).gold_comparison && (
                  <div className="space-y-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2">
                      <Icon name="database" size={14} className="text-blue-600" />
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100">골드 스탠다드 비교</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="space-y-1">
                        <span className="text-muted-foreground">사실 일치도</span>
                        <div className="flex items-center gap-1">
                          <Progress
                            value={(result as EnhancedEvaluationResult).gold_comparison!.fact_coverage * 100}
                            className="h-1 flex-1"
                          />
                          <span className="text-xs">
                            {Math.round((result as EnhancedEvaluationResult).gold_comparison!.fact_coverage * 100)}%
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground">금지 규칙 준수</span>
                        <div className="flex items-center gap-1">
                          <Progress
                            value={(result as EnhancedEvaluationResult).gold_comparison!.forbidden_violations * 100}
                            className="h-1 flex-1"
                          />
                          <span className="text-xs">
                            {Math.round((result as EnhancedEvaluationResult).gold_comparison!.forbidden_violations * 100)}%
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground">주제 일치도</span>
                        <div className="flex items-center gap-1">
                          <Progress
                            value={(result as EnhancedEvaluationResult).gold_comparison!.topic_alignment * 100}
                            className="h-1 flex-1"
                          />
                          <span className="text-xs">
                            {Math.round((result as EnhancedEvaluationResult).gold_comparison!.topic_alignment * 100)}%
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground">간결성</span>
                        <div className="flex items-center gap-1">
                          <Progress
                            value={(result as EnhancedEvaluationResult).gold_comparison!.conciseness_check * 100}
                            className="h-1 flex-1"
                          />
                          <span className="text-xs">
                            {Math.round((result as EnhancedEvaluationResult).gold_comparison!.conciseness_check * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    {(result as EnhancedEvaluationResult).gold_reference && (
                      <div className="text-xs text-muted-foreground">
                        참조: {(result as EnhancedEvaluationResult).gold_reference!.question_id}
                      </div>
                    )}
                  </div>
                )}

                {/* 메타데이터 */}
                {(result.model_name || result.evaluation_duration) && (
                  <div className="flex items-center gap-3 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                    {result.model_name && (
                      <span>모델: {result.model_name}</span>
                    )}
                    {result.evaluation_duration && (
                      <span>소요시간: {result.evaluation_duration}ms</span>
                    )}
                    {result.error && (
                      <div className="flex items-center gap-1 text-destructive">
                        <Icon name="alert-triangle" size={12} />
                        <span>일부 평가 실패</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </Card>
  );
}
