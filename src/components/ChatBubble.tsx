import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Icon } from './ui/Icon';
import { HanaNaviLogo } from './ui/HanaNaviLogo';
import { cn } from './ui/utils';

interface SourceReference {
  id: string;
  title: string;
  content: string;
  datasetId: string;
  datasetName: string;
  chunkId?: string;
  similarity?: number;
  documentId?: string;
  highlightSnippet?: string;
  originalIndex?: number;
}

interface ChatBubbleProps {
  type: 'user' | 'assistant' | 'system';
  content: string;
  state?: 'empty' | 'loading' | 'success' | 'warning' | 'pii-detected';
  timestamp?: string;
  className?: string;
  onRetry?: () => void;
  evidenceCount?: number;
  responseTime?: number;
  hasPII?: boolean;
  isEvidenceLow?: boolean;
  sources?: SourceReference[];
  onSourceClick?: (source: SourceReference) => void;
  onNavigateToKnowledgeBase?: (datasetId: string, docId?: string, chunkId?: string) => void;
  onSwitchToPrecise?: () => void;
}

export function ChatBubble({
  type,
  content,
  state = 'success',
  timestamp,
  className,
  onRetry,
  evidenceCount = 0,
  responseTime,
  hasPII = false,
  isEvidenceLow = false,
  sources,
  onSourceClick,
  onNavigateToKnowledgeBase,
  onSwitchToPrecise
}: ChatBubbleProps) {
  const isUser = type === 'user';
  const isSystem = type === 'system';
  const [copyStatus, setCopyStatus] = React.useState<'idle' | 'copied' | 'error'>('idle');
  const copyResetTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const canCopy = Boolean(content && content.trim().length > 0);

  const sortedSources = React.useMemo(() => {
    if (!sources) return [] as SourceReference[];
    return [...sources].sort((a, b) => {
      const aScore = typeof a.similarity === 'number' ? a.similarity : -Infinity;
      const bScore = typeof b.similarity === 'number' ? b.similarity : -Infinity;
      if (Number.isFinite(bScore) && Number.isFinite(aScore)) return bScore - aScore;
      if (Number.isFinite(bScore)) return 1;
      if (Number.isFinite(aScore)) return -1;
      return 0;
    });
  }, [sources]);

  const fallbackCopyToClipboard = (text: string): boolean => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return successful;
    } catch (error) {
      console.warn('Fallback clipboard copy failed', error);
      return false;
    }
  };

  const handleCopy = async () => {
    if (!canCopy) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        const ok = fallbackCopyToClipboard(content);
        if (!ok) throw new Error('execCommand copy failed');
      }
      setCopyStatus('copied');
    } catch (error) {
      console.error('Clipboard copy failed', error);
      const fallbackOk = fallbackCopyToClipboard(content);
      setCopyStatus(fallbackOk ? 'copied' : 'error');
    }
  };

  React.useEffect(() => {
    if (copyStatus === 'idle') return;
    if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
    copyResetTimer.current = setTimeout(() => setCopyStatus('idle'), 1800);
    return () => {
      if (copyResetTimer.current) {
        clearTimeout(copyResetTimer.current);
        copyResetTimer.current = null;
      }
    };
  }, [copyStatus]);

  React.useEffect(() => () => {
    if (copyResetTimer.current) {
      clearTimeout(copyResetTimer.current);
      copyResetTimer.current = null;
    }
  }, []);


  const [loadingMessage, setLoadingMessage] = React.useState('생각중...');

  React.useEffect(() => {
    if (state !== 'loading') return;
    const messages = ['생각중...', '고민중...', '길을 찾는중...', '자료를 검토중...', '답변을 준비중...'];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setLoadingMessage(messages[index]);
    }, 1500);

    return () => clearInterval(interval);
  }, [state]);

  if (state === 'loading') {
    return (
      <div className={cn(
        "flex gap-3",
        isUser ? "justify-end" : "justify-start",
        className
      )}>
        {!isUser && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 shadow-sm">
            <span className="text-lg">🤖</span>
          </div>
        )}

        <div className={cn(
          "max-w-[70%] space-y-2",
          isUser && "order-first"
        )}>
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span className="animate-pulse">{loadingMessage}</span>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (state === 'empty') {
    return null;
  }

  return (
    <div className={cn(
      "flex gap-3",
      isUser ? "justify-end" : "justify-start",
      className
    )}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 shadow-sm flex-shrink-0">
          {isSystem ? (
            <Icon name="shield" size={16} className="text-gray-600" />
          ) : (
            <span className="text-lg">🤖</span>
          )}
        </div>
      )}
      
      <div className={cn(
        "max-w-[70%] space-y-2",
        isUser && "order-first"
      )}>
        <Card className={cn(
          "p-4",
          isUser 
            ? "bg-primary text-primary-foreground" 
            : state === 'warning' 
            ? "bg-warning/10 border-warning"
            : state === 'pii-detected'
            ? "bg-destructive/10 border-destructive"
            : "bg-card"
        )}>
          {/* PII Detection Warning */}
          {hasPII && !isUser && (
            <Alert className="mb-3 bg-destructive/20 border-destructive/30">
              <Icon name="shield" size={16} />
              <AlertDescription className="text-sm">
                개인정보로 의심되는 값은 자동 마스킹 되었어요.
              </AlertDescription>
            </Alert>
          )}

          {/* Low Evidence Warning */}
          {isEvidenceLow && !isUser && (
            <Alert className="mb-3 bg-warning/20 border-warning/30">
              <Icon name="alert-triangle" size={16} />
              <AlertDescription className="text-sm flex items-center justify-between">
                <span>근거가 부족해요. 정밀검증 모드로 전환할까요?</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-2"
                  onClick={onSwitchToPrecise}
                >
                  전환
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {canCopy && (
            <div className="flex justify-end mb-3 -mt-1">
              <button
                type="button"
                onClick={handleCopy}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-primary/40",
                  isUser
                    ? "bg-white/20 text-white hover:bg-white/30 focus:ring-white/60"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                )}
              >
                <Icon
                  name={copyStatus === 'copied' ? 'check-circle' : copyStatus === 'error' ? 'alert-triangle' : 'copy'}
                  size={12}
                  className={cn(
                    copyStatus === 'copied' && 'text-emerald-500',
                    copyStatus === 'error' && 'text-destructive'
                  )}
                />
                <span>
                  {copyStatus === 'copied'
                    ? '복사됨'
                    : copyStatus === 'error'
                    ? '복사 실패'
                    : '복사'}
                </span>
              </button>
            </div>
          )}

          <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown
              components={{
                // 링크 안전성 확보 및 출처 링크 처리
                a: ({ href, children, ...props }) => {
                  console.log('🔗 링크 감지:', { href, children, props });

                  // 출처 번호 링크 처리 #source-숫자 형태
                  if (href && href.startsWith('#source-')) {
                    const rawIndex = href.replace('#source-', '').trim();
                    const parsedIndex = Number.parseInt(rawIndex, 10);
                    const hasSources = Array.isArray(sources) && sources.length > 0;
                    const totalSources = hasSources ? sources.length : 0;

                    if (!hasSources) {
                      console.warn('⚠️ 출처 링크가 감지되었지만 sources 배열이 비어 있습니다.', {
                        href,
                        children,
                        parsedIndex
                      });
                      return <span className="font-medium text-muted-foreground" title="출처 정보를 찾을 수 없습니다">{children}</span>;
                    }

                    const sourceIndex = Number.isNaN(parsedIndex)
                      ? 0
                      : Math.min(Math.max(parsedIndex, 0), totalSources - 1);

                    const selectedSource = sources[sourceIndex];

                    console.log('🔗 출처 링크 처리:', {
                      href,
                      children,
                      rawIndex,
                      parsedIndex,
                      resolvedSourceIndex: sourceIndex,
                      totalSources,
                      hasSource: Boolean(selectedSource),
                      selectedSource: selectedSource && {
                        title: selectedSource.title,
                        datasetId: selectedSource.datasetId,
                        documentId: selectedSource.documentId,
                        chunkId: selectedSource.chunkId
                      }
                    });

                    if (selectedSource) {
                      return (
                        <button
                          className="inline-flex items-center gap-1 text-primary hover:text-primary/80 underline decoration-dotted underline-offset-2 cursor-pointer font-medium"
                          onClick={(e) => {
                            e.preventDefault();
                            const source = selectedSource;
                            console.log('🔗 출처 링크 클릭:', source);

                            // Knowledge Base로 이동
                            if (onNavigateToKnowledgeBase && source.datasetId) {
                              onNavigateToKnowledgeBase(
                                source.datasetId,
                                source.documentId,
                                source.chunkId
                              );
                            } else {
                              // 기존 방식도 유지
                              onSourceClick?.(source);
                            }
                          }}
                          title={`출처: ${selectedSource.title}`}
                          {...props}
                        >
                          {children}
                          <Icon name="external-link" size={10} className="inline" />
                        </button>
                      );
                    }
                    // 출처가 없으면 일반 텍스트로 표시 (디버깅 정보 포함)
                    console.warn('⚠️ 출처를 찾을 수 없음:', {
                      rawIndex,
                      parsedIndex,
                      totalSources
                    });
                    return <span className="font-medium text-muted-foreground" title={`출처 ${rawIndex || '?'}을 찾을 수 없습니다`}>{children}</span>;
                  }

                  // 일반 링크
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                      {children}
                    </a>
                  );
                },
                // 코드 블록 스타일링
                code: ({ className, children, ...props }) => (
                  <code
                    className={cn(
                      "px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs",
                      className
                    )}
                    {...props}
                  >
                    {children}
                  </code>
                ),
                // 인라인 코드 스타일링
                pre: ({ children, ...props }) => (
                  <pre
                    className="bg-muted p-3 rounded-md overflow-x-auto text-sm"
                    {...props}
                  >
                    {children}
                  </pre>
                ),
                // 테이블 스타일링 개선
                table: ({ children, ...props }) => (
                  <div className="overflow-x-auto my-4">
                    <table
                      className="min-w-full divide-y divide-border border border-border rounded-md"
                      {...props}
                    >
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children, ...props }) => (
                  <thead className="bg-muted" {...props}>
                    {children}
                  </thead>
                ),
                tbody: ({ children, ...props }) => (
                  <tbody className="bg-background divide-y divide-border" {...props}>
                    {children}
                  </tbody>
                ),
                tr: ({ children, ...props }) => (
                  <tr className="hover:bg-muted/50" {...props}>
                    {children}
                  </tr>
                ),
                th: ({ children, ...props }) => (
                  <th
                    className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                    {...props}
                  >
                    {children}
                  </th>
                ),
                td: ({ children, ...props }) => (
                  <td
                    className="px-3 py-2 text-sm text-foreground whitespace-nowrap"
                    {...props}
                  >
                    {children}
                  </td>
                ),
                // 헤딩 스타일링
                h1: ({ children, ...props }) => (
                  <h1 className="text-lg font-bold mt-4 mb-2 text-foreground" {...props}>
                    {children}
                  </h1>
                ),
                h2: ({ children, ...props }) => (
                  <h2 className="text-base font-semibold mt-3 mb-2 text-foreground" {...props}>
                    {children}
                  </h2>
                ),
                h3: ({ children, ...props }) => (
                  <h3 className="text-sm font-medium mt-2 mb-1 text-foreground" {...props}>
                    {children}
                  </h3>
                ),
                // 리스트 스타일링
                ul: ({ children, ...props }) => (
                  <ul className="list-disc ml-4 my-2 space-y-1" {...props}>
                    {children}
                  </ul>
                ),
                ol: ({ children, ...props }) => (
                  <ol className="list-decimal ml-4 my-2 space-y-1" {...props}>
                    {children}
                  </ol>
                ),
                // 강조 텍스트
                strong: ({ children, ...props }) => (
                  <strong className="font-semibold text-foreground" {...props}>
                    {children}
                  </strong>
                ),
                em: ({ children, ...props }) => (
                  <em className="italic text-muted-foreground" {...props}>
                    {children}
                  </em>
                ),
                // 구분선
                hr: ({ ...props }) => (
                  <hr className="my-4 border-border" {...props} />
                ),
                // 블록 인용
                blockquote: ({ children, ...props }) => (
                  <blockquote className="border-l-4 border-primary/30 pl-4 my-2 italic text-muted-foreground" {...props}>
                    {children}
                  </blockquote>
                )
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
          
          {/* Assistant message metadata */}
          {!isUser && type === 'assistant' && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/20">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {responseTime && (
                  <div className="flex items-center gap-1">
                    <Icon name="clock" size={12} />
                    {responseTime.toFixed(1)}초
                  </div>
                )}

                {evidenceCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    근거 {evidenceCount}개
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1">
                {state === 'warning' && onRetry && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRetry}
                    className="h-6 px-2"
                  >
                    <Icon name="refresh-cw" size={12} />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Sources/Citations */}
          {!isUser && sortedSources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/20">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 font-medium">
                <Icon name="map-pin" size={12} className="text-primary" />
                <span>답변 경로</span>
              </div>
              <div className="space-y-1">
                {sortedSources.map((source, index) => (
                  <button
                    key={source.id}
                    onClick={() => onSourceClick?.(source)}
                    className="w-full text-left p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-mono text-muted-foreground flex-shrink-0">
                        [{index + 1}]
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground truncate group-hover:text-primary">
                          {source.title}
                        </div>
                        {source.similarity && (
                          <div className="text-xs text-muted-foreground">
                            유사도 {(source.similarity * 100).toFixed(0)}%
                          </div>
                        )}
                      </div>
                      <Icon name="external-link" size={12} className="text-muted-foreground group-hover:text-primary flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

        </Card>
        
        {timestamp && (
          <div className={cn(
            "text-xs text-muted-foreground px-3",
            isUser ? "text-right" : "text-left"
          )}>
            {timestamp}
          </div>
        )}
      </div>
    </div>
  );
}
