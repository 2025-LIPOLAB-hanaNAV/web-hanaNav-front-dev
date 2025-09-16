import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Icon } from './ui/Icon';
import { HanaNaviLogo } from './ui/HanaNaviLogo';
import { cn } from './ui/utils';

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
  isEvidenceLow = false
}: ChatBubbleProps) {
  const isUser = type === 'user';
  const isSystem = type === 'system';

  // Minimal, safe Markdown renderer (escape HTML first, then inject basic tags)
  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const mdToHtml = (md: string) => {
    let text = escapeHtml(md);
    // headings: ###, ##, # (map to h4/h3/h2 for compactness)
    text = text.replace(/^###\s+(.+)$/gm, '<h4 class="font-medium text-sm mt-2 mb-1">$1</h4>');
    text = text.replace(/^##\s+(.+)$/gm, '<h3 class="font-semibold text-base mt-2 mb-1">$1</h3>');
    text = text.replace(/^#\s+(.+)$/gm, '<h2 class="font-semibold text-lg mt-2 mb-1">$1</h2>');
    // bold **text**
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // italic *text*
    text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
    // unordered lists: group consecutive - or * lines
    const lines = text.split(/\r?\n/);
    const out: string[] = [];
    let inList = false;
    for (const line of lines) {
      const m = line.match(/^\s*[-\*]\s+(.*)$/);
      if (m) {
        if (!inList) { inList = true; out.push('<ul class="list-disc pl-5 my-2 space-y-1">'); }
        out.push(`<li>${m[1]}</li>`);
      } else {
        if (inList) { out.push('</ul>'); inList = false; }
        if (line.trim().length === 0) {
          out.push('<br/>');
        } else {
          out.push(`<p>${line}</p>`);
        }
      }
    }
    if (inList) out.push('</ul>');
    return out.join('\n');
  };

  if (state === 'loading') {
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
            <div dangerouslySetInnerHTML={{ __html: mdToHtml(content) }} />
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
