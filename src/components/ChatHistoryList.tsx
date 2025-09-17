import React, { useEffect, useMemo, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Icon } from './ui/Icon';
import { cn } from './ui/utils';
import { HanaNaviLogo } from './ui/HanaNaviLogo';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Clock, MessageSquareText, Star } from 'lucide-react';
import { listChats, listChatSessions, deleteChatSessions, updateChatSession } from '../services/ragflow';
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
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [renameTarget, setRenameTarget] = useState<ChatSession | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const sessionKey = (session: ChatSession) => `${session.assistantId || 'unknown'}:${session.id}`;

  const clearSessionArtifacts = (session: ChatSession) => {
    if (typeof window === 'undefined') return;
    try { localStorage.removeItem(`hana_messages_${session.id}`); } catch {}
    try {
      const raw = localStorage.getItem('hana_current_session');
      if (raw) {
        const current = JSON.parse(raw) as { sessionId?: string } | null;
        if (current?.sessionId === session.id) {
          localStorage.removeItem('hana_current_session');
        }
      }
    } catch {}
    try { window.dispatchEvent(new CustomEvent('hana-session-deleted', { detail: { assistantId: session.assistantId, sessionId: session.id } })); } catch {}
  };

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

  const selectedSessions = useMemo(() => {
    return sessions.filter((session) => selected[sessionKey(session)]);
  }, [sessions, selected]);

  useEffect(() => {
    // Drop selections for sessions that no longer exist
    setSelected((prev) => {
      const next: Record<string, boolean> = {};
      sessions.forEach((session) => {
        const key = sessionKey(session);
        if (prev[key]) next[key] = true;
      });
      return next;
    });
  }, [sessions]);

  const toggleSelection = (session: ChatSession, value: boolean) => {
    const key = sessionKey(session);
    setSelected((prev) => {
      if (value) return { ...prev, [key]: true };
      if (!prev[key]) return prev;
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const toggleSelectVisible = (value: boolean) => {
    setSelected((prev) => {
      const next = { ...prev };
      visible.forEach((session) => {
        const key = sessionKey(session);
        if (value) {
          next[key] = true;
        } else {
          delete next[key];
        }
      });
      return next;
    });
  };

  const allVisibleSelected = useMemo(() => {
    if (visible.length === 0) return false;
    return visible.every((session) => selected[sessionKey(session)]);
  }, [visible, selected]);

  const handleDelete = async (session: ChatSession) => {
    if (!session.assistantId) {
      setError('세션의 어시스턴트 정보가 없어 삭제할 수 없습니다.');
      return;
    }
    setError(null);
    const ok = window.confirm('이 채팅 기록을 삭제할까요?');
    if (!ok) return;
    const key = sessionKey(session);
    setDeleting(prev => ({ ...prev, [key]: true }));
    const snapshot = sessions;
    // optimistic remove
    setSessions(prev => prev.filter(s => !(s.id === session.id && s.assistantId === session.assistantId)));
    setSelected(prev => {
      const key = sessionKey(session);
      if (!prev[key]) return prev;
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
    try {
      await deleteChatSessions(session.assistantId, [session.id]);
      // 서버 상태를 신뢰하여 목록 재조회
      setRefreshing(true);
      await loadAllSessions();
      clearSessionArtifacts(session);
    } catch (e: any) {
      setError(e?.message || '삭제에 실패했습니다.');
      setSessions(snapshot); // revert
    } finally {
      setDeleting(prev => { const next = { ...prev }; delete next[key]; return next; });
      setRefreshing(false);
    }
  };

  const handleBulkDelete = async () => {
    setError(null);
    const previousSelected = selected;
    const targets = selectedSessions.filter((session) => !!session.assistantId);
    if (targets.length === 0) {
      setError('삭제할 채팅을 선택하세요.');
      return;
    }
    const ok = window.confirm(`선택한 채팅 ${targets.length}개를 삭제할까요?`);
    if (!ok) return;
    setBulkDeleting(true);
    const snapshot = sessions;
    const selectedKeys = new Set(targets.map((session) => sessionKey(session)));
    setSessions((prev) => prev.filter((session) => !selectedKeys.has(sessionKey(session))));
    setSelected({});
    try {
      const grouped: Record<string, string[]> = {};
      targets.forEach((session) => {
        const assistantId = session.assistantId!;
        if (!grouped[assistantId]) grouped[assistantId] = [];
        grouped[assistantId].push(session.id);
      });
      for (const [assistantId, ids] of Object.entries(grouped)) {
        await deleteChatSessions(assistantId, ids);
      }
      setRefreshing(true);
      await loadAllSessions();
      targets.forEach(clearSessionArtifacts);
    } catch (e: any) {
      setError(e?.message || '삭제에 실패했습니다.');
      setSessions(snapshot);
      setSelected(previousSelected);
    } finally {
      setRefreshing(false);
      setBulkDeleting(false);
    }
  };

  const toggleStar = (id: string) => {
    setSessions(prev => prev.map(s => (s.id === id ? { ...s, starred: !s.starred } : s)));
  };

  const openRenameDialog = (session: ChatSession) => {
    setRenameTarget(session);
    setRenameValue(session.title);
    setRenameError(null);
  };

  const closeRenameDialog = () => {
    setRenameTarget(null);
    setRenameValue('');
    setRenameError(null);
  };

  const submitRename = async () => {
    if (!renameTarget) return;
    if (!renameValue.trim()) {
      setRenameError('세션 이름을 입력하세요.');
      return;
    }
    if (!renameTarget.assistantId) {
      setRenameError('어시스턴트 정보가 없어 이름을 수정할 수 없습니다.');
      return;
    }
    setRenameLoading(true);
    setRenameError(null);
    try {
      await updateChatSession(renameTarget.assistantId, renameTarget.id, { name: renameValue.trim() });
      setSessions(prev => prev.map(s => {
        if (s.id === renameTarget.id && s.assistantId === renameTarget.assistantId) {
          return { ...s, title: renameValue.trim() };
        }
        return s;
      }));
      const key = sessionKey(renameTarget);
      setSelected(prev => ({ ...prev, [key]: true }));
      closeRenameDialog();
    } catch (err: any) {
      setRenameError(err?.message || '세션 이름 변경에 실패했습니다.');
    } finally {
      setRenameLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col font-sans">
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
          <div className="flex items-center gap-2">
            {selectedSessions.length > 0 && (
              <>
                <Badge variant="secondary" className="hidden md:inline-flex">
                  {selectedSessions.length}개 선택됨
                </Badge>
                {selectedSessions.length === 1 && selectedSessions[0].assistantId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openRenameDialog(selectedSessions[0])}
                    disabled={bulkDeleting || loading || refreshing}
                  >
                    이름 수정
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting || loading || refreshing}
                >
                  {bulkDeleting ? '삭제 중...' : '선택 삭제'}
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => { setRefreshing(true); loadAllSessions().finally(() => setRefreshing(false)); }} disabled={loading || refreshing || bulkDeleting}>
              {refreshing ? '새로고침 중...' : '새로고침'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

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
              {visible.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={(value) => toggleSelectVisible(Boolean(value))}
                    aria-label="현재 보기 전체 선택"
                  />
                  <span>현재 보기 전체 선택</span>
                </div>
              )}
              {visible.map((s) => (
                <div key={`${s.assistantId || 'unknown'}:${s.id}`} className="group relative">
                  <div className="gap-x-3 py-3 px-4 flex items-center">
                    <Checkbox
                      checked={!!selected[sessionKey(s)]}
                      onCheckedChange={(value) => toggleSelection(s, Boolean(value))}
                      aria-label="채팅 선택"
                      disabled={bulkDeleting || !!deleting[sessionKey(s)]}
                    />
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
                    <div className="shrink-0 flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => toggleStar(s.id)}
                      >
                        <Star
                          className={cn(
                            'h-4 w-4',
                            s.starred ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'
                          )}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDelete(s)}
                        disabled={bulkDeleting || !!deleting[sessionKey(s)]}
                      >
                        삭제
                      </Button>
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

      <Dialog open={!!renameTarget} onOpenChange={(open) => { if (!open) closeRenameDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>세션 제목 수정</DialogTitle>
            <DialogDescription>선택한 채팅의 제목을 변경합니다.</DialogDescription>
          </DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="새 제목" />
          {renameError && (
            <div className="text-xs text-destructive">{renameError}</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeRenameDialog}>취소</Button>
            <Button onClick={submitRename} disabled={renameLoading}>
              {renameLoading ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ChatHistoryList;
