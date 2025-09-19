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
  onSourceClick
}: ChatBubbleProps) {
  const isUser = type === 'user';
  const isSystem = type === 'system';


  if (state === 'loading') {
    const [loadingMessage, setLoadingMessage] = React.useState('생각중...');

    React.useEffect(() => {
      const messages = ['생각중...', '고민중...', '길을 찾는중...', '자료를 검토중...', '답변을 준비중...'];
      let index = 0;
      const interval = setInterval(() => {
        index = (index + 1) % messages.length;
        setLoadingMessage(messages[index]);
      }, 1500);

      return () => clearInterval(interval);
    }, []);

    return (
      <div className={cn(
        "flex gap-3",
        isUser ? "justify-end" : "justify-start",
        className
      )}>
        {!isUser && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-primary to-accent">
            <HanaNaviLogo size={20} className="text-white" />
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
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-primary to-accent flex-shrink-0">
          {isSystem ? (
            <Icon name="shield" size={16} className="text-white" />
          ) : (
            <HanaNaviLogo size={20} className="text-white" />
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
                <Button size="sm" variant="outline" className="ml-2">
                  전환
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{content}</ReactMarkdown>
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
          {!isUser && sources && sources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/20">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 font-medium">
                <Icon name="map-pin" size={12} className="text-primary" />
                <span>답변 경로</span>
              </div>
              <div className="space-y-1">
                {sources.map((source, index) => (
                  <button
                    key={source.id}
                    onClick={() => onSourceClick?.(source)}
                    className="w-full text-left p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-start gap-2">
                      <div className="text-xs font-mono text-muted-foreground mt-0.5 flex-shrink-0">
                        [{index + 1}]
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground truncate group-hover:text-primary">
                          {source.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {source.datasetName}
                          {source.similarity && ` • 유사도 ${(source.similarity * 100).toFixed(0)}%`}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {source.content.slice(0, 100)}...
                        </div>
                      </div>
                      <Icon name="external-link" size={12} className="text-muted-foreground group-hover:text-primary flex-shrink-0 mt-0.5" />
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
