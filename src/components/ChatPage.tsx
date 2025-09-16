import React, { useState, useRef, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { listDatasets, listChats, createChat, updateChat, updateChatSession, deleteChatSessions, type ChatAssistant, converseOnce } from '../services/ragflow';
import { requireConfig, RAGFLOW_ASSISTANT_PRECISE_ID, RAGFLOW_ASSISTANT_QUICK_ID, RAGFLOW_ASSISTANT_SUMMARY_ID } from '../config';
import { Separator } from './ui/separator';
import { ChatBubble } from './ChatBubble';
import { AnswerCard } from './AnswerCard';
import { SearchBar } from './SearchBar';
// import { QualityDashboard } from './QualityDashboard';
import { Icon } from './ui/Icon';
import { cn } from './ui/utils';
import { HanaNaviLogo } from './ui/HanaNaviLogo';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  state?: 'loading' | 'success' | 'warning' | 'pii-detected';
  evidenceCount?: number;
  responseTime?: number;
  hasPII?: boolean;
  isEvidenceLow?: boolean;
}

interface EvidenceItem {
  id: string;
  title: string;
  section: string;
  page?: number;
  confidence: number;
  type: 'official' | 'unofficial' | 'restricted';
  preview: string;
}

interface ChatMode {
  id: string;
  name: string;
  description: string;
  icon: string;
}

type KnowledgeBase = { id: string; name: string };

interface ChatPageProps {
  onEvidenceClick?: (evidence: EvidenceItem) => void;
  initialQuery?: string;
  initialFiles?: File[];
  onQueryProcessed?: () => void;
}
type InitialSession = { assistantId: string; sessionId: string } | undefined;

interface ChatPagePropsExtended extends ChatPageProps {
  initialSession?: InitialSession;
}

export function ChatPage({ onEvidenceClick, initialQuery, initialFiles, onQueryProcessed, initialSession }: ChatPagePropsExtended) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState('quick');
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKBs, setSelectedKBs] = useState<string[]>([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbError, setKbError] = useState<string | null>(null);
  const [isKBOpen, setIsKBOpen] = useState(false);
  // Assistants
  const [assistants, setAssistants] = useState<ChatAssistant[]>([]);
  const [assistantId, setAssistantId] = useState<string>('');
  const [asLoading, setAsLoading] = useState(false);
  const [asError, setAsError] = useState<string | null>(null);
  const [isAddAsOpen, setIsAddAsOpen] = useState(false);
  const [newAsName, setNewAsName] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize session from props
  useEffect(() => {
    if (initialSession?.assistantId) setAssistantId(initialSession.assistantId);
    if (initialSession?.sessionId) setSessionId(initialSession.sessionId);
  }, [initialSession?.assistantId, initialSession?.sessionId]);

  // Persist current session across navigations
  useEffect(() => {
    try {
      const raw = localStorage.getItem('hana_current_session');
      if (raw) {
        const saved = JSON.parse(raw) as { assistantId?: string; sessionId?: string };
        if (saved.assistantId) setAssistantId(saved.assistantId);
        if (saved.sessionId) setSessionId(saved.sessionId);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const payload = JSON.stringify({ assistantId, sessionId });
      localStorage.setItem('hana_current_session', payload);
    } catch {}
  }, [assistantId, sessionId]);

  // Restore cached messages for session
  useEffect(() => {
    if (!sessionId) return;
    try {
      const raw = localStorage.getItem(`hana_messages_${sessionId}`);
      if (raw) {
        const cached = JSON.parse(raw) as typeof messages;
        if (Array.isArray(cached) && cached.length > 0) {
          setMessages(cached);
        }
      }
    } catch {}
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    try {
      const trimmed = messages.slice(-200); // cap to avoid bloating
      localStorage.setItem(`hana_messages_${sessionId}`, JSON.stringify(trimmed));
    } catch {}
  }, [messages, sessionId]);
  
  const chatModes: ChatMode[] = [
    { id: 'quick', name: '빠른답', description: '즉시 답변', icon: 'arrow-right' },
    { id: 'precise', name: '정밀검증', description: '상세 검증', icon: 'search' },
    { id: 'summary', name: '요약전용', description: '핵심만', icon: 'file-text' }
  ];

  const modelByMode: Record<string, string> = {
    quick: 'gemma3:12b',
    precise: 'gpt-oss:latest',
    summary: 'gemma3:27b',
  };

  const defaultAssistantByMode: Record<string, string | undefined> = {
    quick: RAGFLOW_ASSISTANT_QUICK_ID,
    precise: RAGFLOW_ASSISTANT_PRECISE_ID,
    summary: RAGFLOW_ASSISTANT_SUMMARY_ID,
  };

  const defaultAssistants: ChatAssistant[] = [
    defaultAssistantByMode.quick ? { id: defaultAssistantByMode.quick, name: '빠른답', llm: { model_name: modelByMode.quick } } as ChatAssistant : undefined,
    defaultAssistantByMode.precise ? { id: defaultAssistantByMode.precise, name: '정밀검증', llm: { model_name: modelByMode.precise } } as ChatAssistant : undefined,
    defaultAssistantByMode.summary ? { id: defaultAssistantByMode.summary, name: '요약전용', llm: { model_name: modelByMode.summary } } as ChatAssistant : undefined,
  ].filter(Boolean) as ChatAssistant[];

  // Quality dashboard hidden per latest requirement

  const sampleEvidences: EvidenceItem[] = [
    {
      id: '1',
      title: 'HR_휴가정책_v3.2.pdf',
      section: '섹션 3.1 - 육아휴직',
      page: 12,
      confidence: 98,
      type: 'official',
      preview: '근속 6개월 이상의 직원은 육아휴직을 신청할 수 있으며, 최대 1년까지 가능합니다...'
    },
    {
      id: '2',
      title: '사내 공지 2025-03-15',
      section: '육아휴직 급여 지급 안내',
      confidence: 95,
      type: 'official',
      preview: '육아휴직 기간 중에는 기본급의 40%를 육아휴직급여로 지급합니다...'
    }
  ];

  const generateSampleResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('육아휴직') || lowerQuery.includes('출산') || lowerQuery.includes('휴직')) {
      return `육아휴직 급여 지급 기준에 대해 안내드리겠습니다.

**모델 미적용으로 샘플 답변입니다**

근속 6개월 이상의 정규직 직원이 육아휴직을 신청할 수 있으며, 최대 1년까지 가능합니다. 육아휴직 기간 중에는 기본급의 40%를 육아휴직급여로 지급하며, 매월 25일에 계좌로 입금됩니다.

신청 절차는 휴직 시작일 30일 전까지 인사팀에 신청서를 제출하시면 됩니다.`;
    }
    
    if (lowerQuery.includes('대출') || lowerQuery.includes('금리') || lowerQuery.includes('여신')) {
      return `대출 상품에 대해 안내해드리겠습니다.

**모델 미적용으로 샘플 답변입니다**

하나은행에서는 다양한 대출 상품을 제공하고 있습니다. 주택담보대출의 경우 현재 기준금리 + 가산금리로 산정되며, 고객님의 신용등급과 담보 가치에 따라 차등 적용됩니다.

자세한 금리 조건은 영업점에서 상담받으시기 바랍니다.`;
    }
    
    if (lowerQuery.includes('예금') || lowerQuery.includes('적금') || lowerQuery.includes('수신')) {
      return `예적금 상품에 대해 안내해드리겠습니다.

**모델 미적용으로 샘플 답변입니다**

하나은행의 예적금 상품은 고객의 목적에 따라 다양하게 구성되어 있습니다. 정기예금의 경우 예치기간에 따라 우대금리가 적용되며, 적금 상품은 매월 일정 금액을 적립하시는 분들에게 적합합니다.

현재 금리 조건과 상품별 특징은 하나은행 홈페이지에서 확인 가능합니다.`;
    }
    
    if (lowerQuery.includes('연금') || lowerQuery.includes('퇴직')) {
      return `연금 제도에 대해 안내해드리겠습니다.

**모델 미적용으로 샘플 답변입니다**

하나은행의 퇴직연금 제도는 확정급여형(DB)과 확정기여형(DC)으로 구분됩니다. 퇴직 시점에서의 급여 수준과 근속연수에 따라 연금 수령액이 결정됩니다.

자세한 연금 계산 방법과 수령 조건은 인사팀에 문의하시기 바랍니다.`;
    }
    
    if (lowerQuery.includes('보이스피싱') || lowerQuery.includes('사기') || lowerQuery.includes('내점')) {
      return `보이스피싱 내점 고객 처리방법에 대해 안내드리겠습니다.

**모델 미적용으로 샘플 답변입니다**

보이스피싱 피해를 당한 고객이 내점하신 경우:

1. 즉시 거래 중단 및 계좌 지급정지 조치
2. 고객 신분 확인 및 피해 상황 청취
3. 경찰서 신고 안내 및 신고확인서 제출 요청
4. 금감원 신고센터(1332) 신고 안내
5. 피해금액 환급 절차 안내

긴급상황 시에는 즉시 본부 리스크관리팀에 보고하시기 바랍니다.`;
    }
    
    // 기본 샘플 답변
    return `문의하신 내용에 대해 안내드리겠습니다.

**모델 미적용으로 샘플 답변입니다**

현재 하나 내비는 프로토타입 버전으로, 실제 AI 모델이 적용되지 않았습니다. 실제 서비스에서는 하나은행의 내부 문서와 정책을 기반으로 정확한 답변을 제공할 예정입니다.

궁금한 사항이 있으시면 해당 부서 담당자에게 직접 문의하시기 바랍니다.`;
  };

  const handleSearch = async (query: string, files?: File[]) => {
    if (!query.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    console.log('Query submitted with KBs:', selectedKBs, 'assistant:', assistantId, 'files:', files?.map(f => f.name));

    // Add loading message
    const loadingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: '',
      timestamp: '',
      state: 'loading'
    };
    
    setMessages(prev => [...prev, loadingMessage]);

    try {
      const activeAssistantId = assistantId || defaultAssistantByMode[currentMode];
      if (!activeAssistantId) throw new Error('어시스턴트를 선택하거나 기본 ID를 설정하세요.');
      // Bind selected KBs to assistant if provided (API doesn't accept dataset_ids on completions)
      if (selectedKBs.length > 0) {
        try {
          await updateChat(activeAssistantId, { dataset_ids: selectedKBs });
        } catch (e) {
          console.warn('[Chat] updateChat dataset_ids failed:', (e as any)?.message || e);
        }
      }
      const t0 = Date.now();
      const result = await converseOnce(activeAssistantId, { question: query, session_id: sessionId });
      const dt = (Date.now() - t0) / 1000;
      if (result.session_id && !sessionId) {
        setSessionId(result.session_id);
        const name = query.slice(0, 80);
        try { await updateChatSession(activeAssistantId, result.session_id, { name }); } catch {}
      }
      const evidenceCount = result.reference?.chunks?.length || result.reference?.total || 0;
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        type: 'assistant',
        content: result.answer || '응답이 비어 있습니다.',
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        state: 'success',
        evidenceCount: Number(evidenceCount) || undefined,
        responseTime: dt,
        hasPII: false,
        isEvidenceLow: selectedKBs.length > 0 && (!evidenceCount || evidenceCount === 0)
      };
      setMessages(prev => prev.slice(0, -1).concat(assistantMessage));
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        type: 'assistant',
        content: err?.message || '요청에 실패했습니다.',
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        state: 'warning'
      };
      setMessages(prev => prev.slice(0, -1).concat(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!assistantId || !sessionId) return;
    const ok = window.confirm('이 채팅 세션을 삭제할까요?');
    if (!ok) return;
    try {
      await deleteChatSessions(assistantId, [sessionId]);
      try { localStorage.removeItem(`hana_messages_${sessionId}`); } catch {}
      try { localStorage.removeItem('hana_current_session'); } catch {}
      setMessages([]);
      setSessionId(undefined);
    } catch (e: any) {
      alert(e?.message || '세션 삭제에 실패했습니다.');
    }
  };

  // Process initial query when component mounts
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      handleSearch(initialQuery, initialFiles);
      onQueryProcessed?.();
    }
  }, [initialQuery, initialFiles]);

  const handleRetry = () => {
    // Implement retry logic
  };

  const toggleKB = (id: string) => {
    setSelectedKBs(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Load datasets into picker
  const reloadKBs = () => {
    setKbLoading(true);
    setKbError(null);
    try {
      requireConfig();
    } catch {}
    listDatasets({ page: 1, page_size: 50, orderby: 'update_time', desc: true })
      .then(items => {
        setKnowledgeBases(items.map(d => ({ id: d.id, name: d.name })));
      })
      .catch(err => {
        console.warn('[KB] listDatasets failed:', err?.message || err);
        setKbError('지식베이스를 불러오지 못했습니다.');
      })
      .finally(() => setKbLoading(false));
  };

  useEffect(() => {
    reloadKBs();
  }, []);

  // Load chat assistants list
  useEffect(() => {
    setAsLoading(true);
    setAsError(null);
    listChats({ page: 1, page_size: 100, orderby: 'update_time', desc: true })
      .then(items => {
        // merge defaults if not present
        const byId = new Map(items.map(a => [a.id, a] as const));
        defaultAssistants.forEach(d => { if (!byId.has(d.id)) byId.set(d.id, d); });
        setAssistants(Array.from(byId.values()));
      })
      .catch(err => {
        console.warn('[AS] listChats failed:', err?.message || err);
        // fallback to show defaults so user can still pick env-provided IDs
        if (defaultAssistants.length > 0) setAssistants(defaultAssistants);
        setAsError('어시스턴트를 불러오지 못했습니다.');
      })
      .finally(() => setAsLoading(false));
  }, []);

  // Select default assistant based on mode (if provided via env)
  useEffect(() => {
    const defId = defaultAssistantByMode[currentMode];
    if (defId) setAssistantId(defId);
  }, [currentMode]);

  // Initialize assistant on mount for initial mode
  useEffect(() => {
    const defId = defaultAssistantByMode['quick'];
    if (defId) setAssistantId(defId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleFeedback = (messageId: string, isHelpful: boolean, reason?: string) => {
    // Implement feedback logic
    console.log('Feedback:', { messageId, isHelpful, reason });
  };

  const handleContextRollback = () => {
    if (messages.length >= 2) {
      setMessages(prev => prev.slice(0, -2));
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const nextDestinations = [
    {
      id: '1',
      title: '휴직신청서 작성',
      description: '온라인 신청 시스템으로 이동',
      type: 'process' as const
    },
    {
      id: '2',
      title: '인사팀 담당자 연락',
      description: '추가 문의사항 상담',
      type: 'contact' as const
    }
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Quality Dashboard removed by request */}

      {/* Chat Controls (filters removed; KB chooser added) */}
      <div className="flex items-center justify-between p-4 border-b bg-elevated">
        <div className="flex items-center gap-4">
          {/* Mode Toggle */}
          <div className="flex items-center gap-2">
            <Icon name="settings" size={16} className="text-muted-foreground" />
            <Select value={currentMode} onValueChange={setCurrentMode}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {chatModes.map((mode) => {
                  return (
                    <SelectItem key={mode.id} value={mode.id}>
                      <div className="flex items-center gap-2">
                        <Icon name={mode.icon as any} size={16} />
                        <span>{mode.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Knowledge Base Selector (Dialog) */}
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsKBOpen(true)}>
            <Icon name="book-open" size={16} />
            지식베이스 선택
            {selectedKBs.length > 0 && (
              <Badge variant="secondary" className="ml-1">{selectedKBs.length}</Badge>
            )}
          </Button>
          <Dialog open={isKBOpen} onOpenChange={setIsKBOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>지식베이스 선택</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">데이터셋 목록</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={reloadKBs} disabled={kbLoading}>새로고침</Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedKBs([])}>전체 해제</Button>
                  </div>
                </div>
                {kbError && <div className="text-xs text-destructive">{kbError}</div>}
                <div className="max-h-80 overflow-auto space-y-1">
                  {kbLoading ? (
                    <div className="text-sm text-muted-foreground">불러오는 중...</div>
                  ) : knowledgeBases.length === 0 ? (
                    <div className="text-sm text-muted-foreground">등록된 지식베이스가 없습니다.</div>
                  ) : (
                    knowledgeBases.map(kb => (
                      <label key={kb.id} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={selectedKBs.includes(kb.id)} onCheckedChange={() => toggleKB(kb.id)} />
                        <span className="truncate">{kb.name}</span>
                      </label>
                    ))
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setIsKBOpen(false)}>닫기</Button>
                  <Button onClick={() => setIsKBOpen(false)}>확인</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Assistant Selector */}
          <Select value={assistantId} onValueChange={setAssistantId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder={asLoading ? '불러오는 중...' : '어시스턴트 선택'} />
            </SelectTrigger>
            <SelectContent>
              {assistants.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {assistantId && (
            <Badge variant="secondary" className="ml-1">모델: {assistants.find(a => a.id === assistantId)?.llm?.model_name || modelByMode[currentMode]}</Badge>
          )}

          <Dialog open={isAddAsOpen} onOpenChange={setIsAddAsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">새 어시스턴트</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>어시스턴트 생성</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input placeholder="이름" value={newAsName} onChange={(e) => setNewAsName(e.target.value)} />
                <div className="text-xs text-muted-foreground">선택된 지식베이스로 어시스턴트를 생성합니다.</div>
                {asError && <div className="text-xs text-destructive">{asError}</div>}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddAsOpen(false)}>취소</Button>
                  <Button onClick={async () => {
                    const name = newAsName.trim();
                    if (!name) return;
                    if (selectedKBs.length === 0) { setAsError('지식베이스를 선택하세요.'); return; }
                    try {
                      const a = await createChat({ name, dataset_ids: selectedKBs, llm: { model_name: modelByMode[currentMode] || modelByMode.quick } });
                      setAssistants(prev => [a, ...prev]);
                      setAssistantId(a.id);
                      setNewAsName('');
                      setIsAddAsOpen(false);
                    } catch (err: any) {
                      setAsError(err?.message || '어시스턴트 생성 실패');
                    }
                  }}>생성</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* 파일 관리/데이터셋 생성은 지식베이스 탭으로 이동됨 */}
        </div>

        <div className="flex items-center gap-2">
          {assistantId && sessionId && (
            <Button variant="destructive" size="sm" onClick={handleDeleteSession}>
              세션 삭제
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleContextRollback}
            disabled={messages.length < 2}
            className="text-muted-foreground"
          >
            <Icon name="arrow-right" size={16} />
            되돌리기
          </Button>
        </div>
      </div>

      {/* Selected KB chips */}
      {selectedKBs.length > 0 && (
        <div className="px-4 py-2 border-b bg-muted/20">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">선택된 지식베이스:</span>
            {selectedKBs.map(id => {
              const kb = knowledgeBases.find(k => k.id === id);
              return (
                <Badge key={id} variant="secondary" className="cursor-pointer" onClick={() => toggleKB(id)}>
                  {kb?.name || id} ×
                </Badge>
              );
            })}
            <Button variant="ghost" size="sm" className="h-6 px-2 text-muted-foreground" onClick={() => setSelectedKBs([])}>전체 해제</Button>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <HanaNaviLogo size={96} className="mb-2 opacity-50" />
            <div className="space-y-2">
              <h3 className="font-medium">아직 방문지가 없어요</h3>
              <p className="text-muted-foreground">
                첫 질문을 입력해 보세요.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div key={message.id} className="space-y-4">
                <ChatBubble
                  type={message.type}
                  content={message.content}
                  state={message.state}
                  timestamp={message.timestamp}
                  onRetry={handleRetry}
                  evidenceCount={message.evidenceCount}
                  responseTime={message.responseTime}
                  hasPII={message.hasPII}
                  isEvidenceLow={message.isEvidenceLow}
                />
                
                {/* Answer Card for assistant messages with evidence */}
                {message.type === 'assistant' && 
                 message.state === 'success' && 
                 message.evidenceCount && 
                 message.evidenceCount > 0 && (
                  <div className="ml-11">
                    <AnswerCard
                      id={message.id}
                      summary={message.content}
                      evidence={sampleEvidences}
                      preview="육아휴직 정책에 대한 상세한 내용은 사내 인트라넷의 HR 정책 섹션에서 확인하실 수 있습니다. 추가적으로 각 지점별로 차이가 있을 수 있으니 인사팀 담당자와 상담하시기 바랍니다."
                      nextDestinations={nextDestinations}
                      onEvidenceClick={onEvidenceClick}
                      className="mt-4"
                    />
                    
                    {/* Feedback Bar */}
                    <div className="flex items-center justify-center gap-4 mt-4 p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm text-muted-foreground">이 답변이 도움되었나요?</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFeedback(message.id, true)}
                          className="text-muted-foreground hover:text-success"
                        >
                          <Icon name="check-circle" size={16} />
                          도움됨
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFeedback(message.id, false)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Icon name="help-circle" size={16} />
                          안도움됨
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Search Input */}
      <div className="p-4 border-t bg-elevated">
        <SearchBar
          onSearch={handleSearch}
          onVoiceToggle={setIsVoiceActive}
          isVoiceActive={isVoiceActive}
          isLoading={isLoading}
          placeholder="추가 질문을 입력하세요..."
        />
      </div>

    </div>
  );
}
