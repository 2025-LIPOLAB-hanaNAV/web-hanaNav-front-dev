import React, { useEffect, useMemo, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Icon } from './ui/Icon';
import { cn } from './ui/utils';
import { HanaNaviLogo } from './ui/HanaNaviLogo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { MoreHorizontal, Clock, MessageSquareText, Star } from 'lucide-react';
import { listChats, listChatSessions, deleteChatSessions } from '../services/ragflow';
import { RAGFLOW_ASSISTANT_PRECISE_ID, RAGFLOW_ASSISTANT_QUICK_ID, RAGFLOW_ASSISTANT_SUMMARY_ID } from '../config';

type ChatSession = {
  id: string;
  title: string;
  preview: string;
  messageCount: number;
  updatedAt: string; // ISO string
  starred?: boolean;
  assistantId?: string;
};

type Props = {
  onOpenSession?: (session: ChatSession) => void;
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hour = Math.floor(min / 60);
  const day = Math.floor(hour / 24);
  if (day > 0) return `${day}일 전`;
  if (hour > 0) return `${hour}시간 전`;
  if (min > 0) return `${min}분 전`;
  return '방금 전';
}

export function ChatHistoryList({ onOpenSession }: Props) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const loadAllSessions = async () => {
    setError(null);
    try {
      const assistants = await listChats({ page: 1, page_size: 100, orderby: 'update_time', desc: true });
      const envIds = [RAGFLOW_ASSISTANT_QUICK_ID, RAGFLOW_ASSISTANT_PRECISE_ID, RAGFLOW_ASSISTANT_SUMMARY_ID].filter(Boolean) as string[];
      const ids = Array.from(new Set([...(assistants?.map(a => a.id) || []), ...envIds]));
      const all: ChatSession[] = [];
      for (const id of ids) {
        const list = await listChatSessions(id, { page: 1, page_size: 100, orderby: 'update_time', desc: true });
        list.forEach((s) => {
          const msgs = s.messages || [];
          const nonEmpty = msgs.filter(m => (m.content || '').trim().length > 0);
          const last = nonEmpty[nonEmpty.length - 1];
          all.push({
            id: s.id,
            title: s.name || '제목 없음',
            preview: last?.content || '',
            messageCount: nonEmpty.length,
            updatedAt: s.update_time ? new Date(s.update_time).toISOString() : new Date().toISOString(),
            assistantId: id,
          });
        });
      }
      setSessions(all);
    } catch (e: any) {
      setError(e?.message || '세션 목록 로드 실패');
    }
  };

  useEffect(() => {
    setLoading(true);
    loadAllSessions().finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? sessions.filter(s =>
          s.title.toLowerCase().includes(q) || s.preview.toLowerCase().includes(q)
        )
      : sessions;
    // 별표 우선 → 최신순
    return [...filtered].sort((a, b) => {
      if ((a.starred ? 1 : 0) !== (b.starred ? 1 : 0)) return (b.starred ? 1 : 0) - (a.starred ? 1 : 0);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [sessions, searchQuery]);

  const handleDelete = async (session: ChatSession) => {
    if (!session.assistantId) {
      setError('세션의 어시스턴트 정보가 없어 삭제할 수 없습니다.');
      return;
    }
    const ok = window.confirm('이 채팅 기록을 삭제할까요?');
    if (!ok) return;
    setDeleting(prev => ({ ...prev, [session.id]: true }));
    const snapshot = sessions;
    // optimistic remove
    setSessions(prev => prev.filter(s => !(s.id === session.id && s.assistantId === session.assistantId)));
    try {
      await deleteChatSessions(session.assistantId, [session.id]);
      // 서버 상태를 신뢰하여 목록 재조회
      setRefreshing(true);
      await loadAllSessions();
    } catch (e: any) {
      setError(e?.message || '삭제에 실패했습니다.');
      setSessions(snapshot); // revert
    } finally {
      setDeleting(prev => { const next = { ...prev }; delete next[session.id]; return next; });
      setRefreshing(false);
    }
  };

  const toggleStar = (id: string) => {
    setSessions(prev => prev.map(s => (s.id === id ? { ...s, starred: !s.starred } : s)));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4 gap-4">
          <div className="flex items-center gap-3">
            <HanaNaviLogo size={40} className="opacity-80" />
            <div>
              <h1 className="text-2xl font-medium">라이브러리</h1>
              <p className="text-muted-foreground mt-1">채팅 기록 {visible.length}개</p>
            </div>
          </div>
          <div className="w-full md:w-80 relative">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="채팅 기록 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div>
            <Button variant="outline" size="sm" onClick={() => { setRefreshing(true); loadAllSessions().finally(() => setRefreshing(false)); }} disabled={loading || refreshing}>
              {refreshing ? '새로고침 중...' : '새로고침'}
            </Button>
          </div>
        </div>

        {/* List */}
        <Card className="bg-elevated p-0 overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-muted-foreground">불러오는 중...</div>
          ) : visible.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              {searchQuery.trim() ? '검색 결과가 없습니다.' : '저장된 채팅 기록이 없습니다.'}
            </div>
          ) : (
            <div className="divide-y">
              {visible.map((s) => (
                <div key={`${s.assistantId || 'unknown'}:${s.id}`} className="group relative">
                  <div className="gap-x-3 py-3 px-4 flex items-center">
                    <div className="flex grow flex-col min-w-0">
                      <button
                        className="text-left group/title block overflow-x-hidden"
                        onClick={() => onOpenSession?.(s)}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'line-clamp-1 break-all font-medium',
                            'md:group-hover/title:text-primary'
                          )}>
                            {s.title}
                          </div>
                          {s.starred && (
                            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                        <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {s.preview}
                        </div>
                      </button>
                    </div>
                    <div className="shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onOpenSession?.(s)}>열기</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleStar(s.id)}>
                            {s.starred ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => handleDelete(s)} disabled={!!deleting[s.id]}>
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="px-4 pb-3 -mt-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 -translate-y-[1px]" />
                        <span>{timeAgo(s.updatedAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquareText className="h-3.5 w-3.5 -translate-y-[1px]" />
                        <span>{s.messageCount}개 메시지</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default ChatHistoryList;
