import React, { useState, useRef, useEffect, memo } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { listDatasets, listChats, updateChat, updateChatSession, deleteChatSessions, createChatSession, type ChatAssistant, converseStream, createDataset, uploadDocuments, parseDocuments, deleteDatasets, createChat, deleteChats } from '../services/ragflow';
import { requireConfig, RAGFLOW_ASSISTANT_PRECISE_ID, RAGFLOW_ASSISTANT_QUICK_ID, RAGFLOW_ASSISTANT_SUMMARY_ID } from '../config';
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
  sources?: SourceReference[];
}

interface SourceReference {
  id: string;
  title: string;
  content: string;
  datasetId: string;
  datasetName: string;
  chunkId?: string;
  similarity?: number;
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
  onSourceClick?: (source: SourceReference) => void;
  initialQuery?: string;
  initialFiles?: File[];
  onQueryProcessed?: () => void;
}
type InitialSession = { assistantId: string; sessionId: string } | undefined;

interface ChatPagePropsExtended extends ChatPageProps {
  initialSession?: InitialSession;
}

// 간단한 모델 배지 컴포넌트
const ModelBadge = memo(({ assistantId, assistants, currentMode, modelByMode }: {
  assistantId: string;
  assistants: ChatAssistant[];
  currentMode: string;
  modelByMode: Record<string, string>;
}) => {
  // 현재 모드에 따른 모델명 가져오기
  const currentModelName = modelByMode[currentMode] || 'gemma3:12b';

  return (
    <div className="flex-shrink-0">
      <Badge variant="secondary" className="text-xs px-2 py-1">
        <span className="hidden md:inline">모델: </span>
        Ollama@{currentModelName}
      </Badge>
    </div>
  );
});

export function ChatPage({ onEvidenceClick, onSourceClick, initialQuery, initialFiles, onQueryProcessed, initialSession }: ChatPagePropsExtended) {
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
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [sessionCreating, setSessionCreating] = useState(false);
  const [kbApplying, setKbApplying] = useState(false);
  const [kbToast, setKbToast] = useState<string | null>(null);
  const [kbToastType, setKbToastType] = useState<'success' | 'error' | null>(null);
  // Ephemeral context for attachments
  const [ephemeralDatasetId, setEphemeralDatasetId] = useState<string | undefined>(undefined);
  const [ephemeralAssistantId, setEphemeralAssistantId] = useState<string | undefined>(undefined);
  const [ephemeralStatus, setEphemeralStatus] = useState<'idle' | 'uploading' | 'parsing' | 'ready' | 'error'>('idle');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasExternalSession = useRef(false);
  const activeStreamController = useRef<AbortController | null>(null);

  // Initialize session from props and load previous messages
  useEffect(() => {
    if (initialSession?.assistantId && initialSession?.sessionId) {
      const currentKey = `${assistantId}:${sessionId}`;
      const newKey = `${initialSession.assistantId}:${initialSession.sessionId}`;
      const needsUpdate = currentKey !== newKey;

      if (needsUpdate) {
        console.log('Loading new session:', initialSession);
        hasExternalSession.current = true;

        // 먼저 상태 업데이트
        setAssistantId(initialSession.assistantId);
        setSessionId(initialSession.sessionId);

        // 메시지가 전달되었으면 직접 사용
        if (initialSession.messages && initialSession.messages.length > 0) {
          const convertedMessages = initialSession.messages
            .filter(msg => (msg.content || '').trim().length > 0)
            .map((msg, index) => ({
              id: `${initialSession.sessionId}_msg_${index}`,
              type: msg.role === 'assistant' ? 'assistant' as const : 'user' as const,
              content: msg.content || '',
              timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
              state: 'success' as const
            }));

          console.log('Loading messages from session data:', convertedMessages);
          setMessages(convertedMessages);

          // 로컬 스토리지에도 저장
          try {
            localStorage.setItem(`hana_messages_${initialSession.sessionId}`, JSON.stringify(convertedMessages));
          } catch (e) {
            console.warn('Failed to save messages to localStorage:', e);
          }
        } else {
          console.log('No messages in session data, setting empty array');
          setMessages([]);
        }
      }
    }
  }, [initialSession?.assistantId, initialSession?.sessionId, initialSession?.messages]);



  // Restore persisted session when no explicit target was provided
  useEffect(() => {
    if (initialSession?.assistantId || initialSession?.sessionId) return;
    try {
      const raw = localStorage.getItem('hana_current_session');
      if (raw) {
        const saved = JSON.parse(raw) as { assistantId?: string; sessionId?: string; ephemeralAssistantId?: string; ephemeralDatasetId?: string };
        if (saved.assistantId) {
          hasExternalSession.current = true;
          setAssistantId(saved.assistantId);
        }
        if (saved.sessionId) {
          hasExternalSession.current = true;
          setSessionId(saved.sessionId);
        }
        if (saved.ephemeralDatasetId) setEphemeralDatasetId(saved.ephemeralDatasetId);
        if (saved.ephemeralAssistantId) setEphemeralAssistantId(saved.ephemeralAssistantId);
      }
    } catch {}
  }, [initialSession?.assistantId, initialSession?.sessionId]);

  // Persist current session across navigations
  useEffect(() => {
    try {
      const payload = JSON.stringify({ assistantId, sessionId, ephemeralAssistantId, ephemeralDatasetId });
      localStorage.setItem('hana_current_session', payload);
    } catch {}
  }, [assistantId, sessionId, ephemeralAssistantId, ephemeralDatasetId]);

  // React to deletions triggered outside of ChatPage (e.g., Library bulk delete)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ sessionId?: string; assistantId?: string }>).detail;
      if (!detail?.sessionId) return;
      if (detail.sessionId === sessionId) {
        setMessages([]);
        setSessionId(undefined);
      }
    };
    window.addEventListener('hana-session-deleted', handler as EventListener);
    return () => {
      window.removeEventListener('hana-session-deleted', handler as EventListener);
    };
  }, [sessionId]);

  useEffect(() => {
    return () => {
      activeStreamController.current?.abort();
    };
  }, []);

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


  // Ephemeral context: ensure assistant/dataset for attachments
  const ensureEphemeralContext = async (files?: File[]): Promise<string | undefined> => {
    const hasFiles = (files && files.length > 0);
    if (!hasFiles && ephemeralAssistantId) return ephemeralAssistantId;
    if (!hasFiles) return undefined;

    setEphemeralStatus('uploading');
    try {
      let dsId = ephemeralDatasetId;
      if (!dsId) {
        const ds = await createDataset({ name: `임시 컨텍스트 ${new Date().toLocaleString('ko-KR')}` });
        dsId = ds.id;
        setEphemeralDatasetId(dsId);
      }
      const docs = await uploadDocuments(dsId!, files!);
      try { await parseDocuments(dsId!, docs.map(d => d.id)); } catch {}
      setEphemeralStatus('parsing');

      let eaId = ephemeralAssistantId;
      if (!eaId) {
        const activeModel = assistants.find(a => a.id === assistantId)?.llm?.model_name || modelByMode[currentMode];
        const name = `임시 어시스턴트 ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
        const created = await createChat({
          name,
          dataset_ids: selectedKBs.length > 0 ? [dsId!, ...selectedKBs] : [dsId!],
          llm: activeModel ? { model_name: activeModel } : undefined,
          prompt: {
            system: "You are a helpful AI assistant. Please provide accurate and helpful responses based on the following knowledge:\n\n{knowledge}",
            quote: true,
            keyword: false,
            parameters: [
              { key: "knowledge", optional: false, type: "string" }
            ]
          },
        });
        eaId = created.id;
        setEphemeralAssistantId(eaId);
      } else {
        const ids = selectedKBs.length > 0 ? [dsId!, ...selectedKBs] : [dsId!];
        try { await updateChat(eaId, { dataset_ids: ids }); } catch {}
      }

      setAssistantId(eaId!);
      setEphemeralStatus('ready');
      hasExternalSession.current = true;
      return eaId!;
    } catch (e) {
      console.warn('[Ephemeral] setup failed:', (e as any)?.message || e);
      setEphemeralStatus('error');
      return undefined;
    }
  };

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

  const ensureSession = async (activeAssistantId: string, initialName: string): Promise<string> => {
    if (sessionId) return sessionId;
    setSessionCreating(true);
    try {
      const created = await createChatSession(activeAssistantId, { name: initialName || '새 대화' });
      setSessionId(created.id);
      hasExternalSession.current = true;
      return created.id;
    } finally {
      setSessionCreating(false);
    }
  };

  const applySelectedKnowledgeBases = async () => {
    const isEphemeral = ephemeralAssistantId && assistantId === ephemeralAssistantId;
    const activeAssistantId = isEphemeral ? ephemeralAssistantId! : (assistantId || defaultAssistantByMode[currentMode]);
    if (!activeAssistantId) {
      alert('어시스턴트를 먼저 선택하세요.');
      return;
    }
    setKbApplying(true);
    setKbToast(null);
    setKbToastType(null);
    try {
      if (isEphemeral) {
        const ids = ephemeralDatasetId ? [ephemeralDatasetId, ...selectedKBs] : [...selectedKBs];
        // 지식베이스와 함께 프롬프트도 자동 업데이트
        await updateChat(activeAssistantId, {
          dataset_ids: ids,
          prompt: ids.length > 0 ? {
            system: "You are a helpful AI assistant. Please provide accurate and helpful responses based on the following knowledge:\n\n{knowledge}",
            quote: true,
            keyword: false,
            parameters: [
              { key: "knowledge", optional: false, type: "string" }
            ]
          } : {
            system: "You are a helpful AI assistant. Please provide accurate and helpful responses.",
            quote: false,
            keyword: false,
            parameters: []
          }
        });
      } else {
        // 일반 어시스턴트도 프롬프트 자동 업데이트
        await updateChat(activeAssistantId, {
          dataset_ids: selectedKBs,
          prompt: selectedKBs.length > 0 ? {
            system: "You are a helpful AI assistant. Please provide accurate and helpful responses based on the following knowledge:\n\n{knowledge}",
            quote: true,
            keyword: false,
            parameters: [
              { key: "knowledge", optional: false, type: "string" }
            ]
          } : {
            system: "You are a helpful AI assistant. Please provide accurate and helpful responses.",
            quote: false,
            keyword: false,
            parameters: []
          }
        });
      }
      setKbToast(selectedKBs.length === 0 ? '지식베이스 연결이 해제되었습니다.' : `${selectedKBs.length}개 지식베이스가 연결되어 자동으로 설정되었습니다.`);
      setKbToastType('success');
    } catch (err: any) {
      setKbToast(err?.message || '지식베이스 적용에 실패했습니다.');
      setKbToastType('error');
    } finally {
      setKbApplying(false);
      setTimeout(() => { setKbToast(null); setKbToastType(null); }, 4000);
    }
  };

  const handleSearch = async (query: string, files?: File[]) => {
    if (!query.trim()) return;

    activeStreamController.current?.abort();
    const streamController = new AbortController();
    activeStreamController.current = streamController;

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

    const loadingMessageId = `assistant_${Date.now() + 1}`;
    const loadingMessage: ChatMessage = {
      id: loadingMessageId,
      type: 'assistant',
      content: '',
      timestamp: '',
      state: 'loading'
    };

    setMessages(prev => [...prev, loadingMessage]);

    const preprocessMarkdownText = (text: string): string => {
      let cleaned = text.replace(/\[ID:\d+\]/g, '');

      cleaned = cleaned.replace(/\[(\d+)\]/g, (match, num) => {
        const index = parseInt(num);
        return `[${index + 1}]`;
      });

      const boldTextMap = new Map<string, string>();
      let boldCounter = 0;
      cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, (match, content) => {
        const placeholder = `__BOLD_${boldCounter++}__`;
        boldTextMap.set(placeholder, match);
        return placeholder;
      });

      cleaned = cleaned.replace(/\.\s/g, '.   ');
      cleaned = cleaned.replace(/([^\n])(#+\s)/g, '$1\n$2');
      cleaned = cleaned.replace(/([^\n])(\d+\.\s)/g, '$1\n$2');
      cleaned = cleaned.replace(/([^\n])(\|[^|]*\|)/g, '$1\n$2');
      cleaned = cleaned.replace(/(\|[^|]*\|)([^\n|])/g, '$1\n$2');
      cleaned = cleaned.replace(/([^\n])([-*_]{3,})/g, '$1\n$2');
      cleaned = cleaned.replace(/([-*_]{3,})([^\n])/g, '$1\n$2');
      cleaned = cleaned.replace(/([^\n])([-*+]\s)/g, '$1\n$2');
      cleaned = cleaned.replace(/([^\n])(```)/g, '$1\n$2');
      cleaned = cleaned.replace(/(```[^`]*```)([^\n])/g, '$1\n$2');
      cleaned = cleaned.replace(/([^\n])(>\s)/g, '$1\n$2');

      boldTextMap.forEach((original, placeholder) => {
        cleaned = cleaned.replace(placeholder, original);
      });

      cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
      cleaned = cleaned.trim();

      return cleaned;
    };

    try {
      const ephemeralId = await ensureEphemeralContext(files);
      const activeAssistantId = ephemeralId || assistantId || defaultAssistantByMode[currentMode];
      if (!activeAssistantId) throw new Error('어시스턴트를 선택하거나 기본 ID를 설정하세요.');

      const desiredName = query.slice(0, 80) || '새 대화';
      const ensuredSessionId = await ensureSession(activeAssistantId, desiredName);
      const t0 = Date.now();

      let latestAnswer = '';
      let latestReference: any = undefined;
      let latestSessionId: string | undefined;
      let lastRendered = '';

      const updateAssistantContent = (raw?: string) => {
        if (typeof raw !== 'string') return;
        const processed = preprocessMarkdownText(raw);
        if (processed === lastRendered) return;
        lastRendered = processed;
        setMessages(prev =>
          prev.map(msg =>
            msg.id === loadingMessageId
              ? { ...msg, content: processed, state: 'success' }
              : msg
          )
        );
      };

      const result = await converseStream(
        activeAssistantId,
        { question: query, session_id: ensuredSessionId },
        {
          signal: streamController.signal,
          onMessage: (partial) => {
            if (partial.answer !== undefined) {
              latestAnswer = partial.answer || '';
              updateAssistantContent(latestAnswer);
            } else if (latestAnswer) {
              updateAssistantContent(latestAnswer);
            }

            if (partial.reference !== undefined) {
              latestReference = partial.reference;
            }

            if (partial.session_id) {
              latestSessionId = partial.session_id;
            }
          }
        }
      );

      const dt = (Date.now() - t0) / 1000;
      const effectiveAnswer = result.answer ?? latestAnswer;
      const effectiveReference = result.reference ?? latestReference;
      const effectiveSessionId = result.session_id ?? latestSessionId;

      if (effectiveSessionId && !sessionId) {
        setSessionId(effectiveSessionId);
        const name = query.slice(0, 80);
        try { await updateChatSession(activeAssistantId, effectiveSessionId, { name }); } catch {}
      }

      const evidenceCount = effectiveReference?.chunks?.length || effectiveReference?.total || 0;
      const sources: SourceReference[] = effectiveReference?.chunks?.map((chunk: any, index: number) => ({
        id: `source_${index}`,
        title: chunk.document_name || chunk.doc_name || `문서 ${index + 1}`,
        content: chunk.content_with_weight || chunk.content || '',
        datasetId: chunk.dataset_id || '',
        datasetName: chunk.dataset_name || '알 수 없음',
        chunkId: chunk.chunk_id || chunk.id,
        similarity: chunk.similarity || chunk.score
      })) || [];

      console.log('RAG Response Debug:', {
        reference: effectiveReference,
        chunks: effectiveReference?.chunks,
        sources: sources
      });

      const finalContent = preprocessMarkdownText(effectiveAnswer || '응답이 비어 있습니다.');

      setMessages(prev =>
        prev.map(msg =>
          msg.id === loadingMessageId
            ? {
                ...msg,
                content: finalContent,
                timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
                state: 'success',
                evidenceCount: Number(evidenceCount) || undefined,
                responseTime: dt,
                hasPII: false,
                isEvidenceLow: selectedKBs.length > 0 && (!evidenceCount || evidenceCount === 0),
                sources: sources.length > 0 ? sources : undefined
              }
            : msg
        )
      );
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setMessages(prev => prev.filter(msg => msg.id !== loadingMessageId));
      } else {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 2).toString(),
          type: 'assistant',
          content: err?.message || '요청에 실패했습니다.',
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          state: 'warning'
        };
        setMessages(prev => prev.filter(msg => msg.id !== loadingMessageId).concat(errorMessage));
      }
    } finally {
      setIsLoading(false);
      if (activeStreamController.current === streamController) {
        activeStreamController.current = null;
      }
    }
  };

  const handleDeleteSession = async () => {
    if (!assistantId || !sessionId) return;
    const ok = window.confirm('이 채팅 세션을 삭제할까요?');
    if (!ok) return;
    try {
      await deleteChatSessions(assistantId, [sessionId]);
      if (ephemeralAssistantId) {
        try { await deleteChats([ephemeralAssistantId]); } catch {}
      }
      if (ephemeralDatasetId) {
        try { await deleteDatasets([ephemeralDatasetId]); } catch {}
      }
      try { localStorage.removeItem(`hana_messages_${sessionId}`); } catch {}
      try { localStorage.removeItem('hana_current_session'); } catch {}
      try { window.dispatchEvent(new CustomEvent('hana-session-deleted', { detail: { assistantId, sessionId } })); } catch {}
      setMessages([]);
      setSessionId(undefined);
      setEphemeralAssistantId(undefined);
      setEphemeralDatasetId(undefined);
      setEphemeralStatus('idle');
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
    listChats({ page: 1, page_size: 100, orderby: 'update_time', desc: true })
      .then(items => {
        console.log('RAGFlow listChats response:', items);
        // merge defaults if not present
        const byId = new Map(items.map(a => [a.id, a] as const));
        defaultAssistants.forEach(d => { if (!byId.has(d.id)) byId.set(d.id, d); });
        const finalAssistants = Array.from(byId.values());
        console.log('Final assistants list:', finalAssistants);
        setAssistants(finalAssistants);
      })
      .catch(err => {
        console.warn('[AS] listChats failed:', err?.message || err);
        // fallback to show defaults so user can still pick env-provided IDs
        if (defaultAssistants.length > 0) setAssistants(defaultAssistants);
      })
      .finally(() => setAsLoading(false));
  }, []);

  // Select default assistant based on mode (if provided via env)
  useEffect(() => {
    if (hasExternalSession.current) return;
    if (assistantId) return;
    const defId = defaultAssistantByMode[currentMode];
    if (defId) setAssistantId(defId);
  }, [currentMode, assistantId]);


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
      <div className="border-b bg-elevated">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between p-3 gap-3">
          <div className="flex items-center gap-2 min-w-0 overflow-x-auto">
            {/* Mode Toggle */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Icon name="settings" size={14} className="text-muted-foreground" />
              <Select value={currentMode} onValueChange={setCurrentMode}>
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {chatModes.map((mode) => {
                    return (
                      <SelectItem key={mode.id} value={mode.id}>
                        <div className="flex items-center gap-2">
                          <Icon name={mode.icon as any} size={14} />
                          <span className="text-xs">{mode.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Knowledge Base Selector (Dialog) */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" className="gap-1 h-8 text-xs px-2" onClick={() => setIsKBOpen(true)}>
                <Icon name="book-open" size={14} />
                <span className="hidden sm:inline">지식베이스</span>
                {selectedKBs.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1">{selectedKBs.length}</Badge>
                )}
              </Button>
              <Button variant="secondary" size="sm" className="h-8 text-xs px-2" onClick={applySelectedKnowledgeBases} disabled={kbApplying}>
                {kbApplying ? '적용중' : '적용'}
              </Button>
            </div>
            {/* Assistant Selector */}
            <Select value={assistantId} onValueChange={setAssistantId}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder={asLoading ? '로딩중' : '어시스턴트'} />
              </SelectTrigger>
              <SelectContent>
                {assistants.map(a => (
                  <SelectItem key={a.id} value={a.id} className="text-xs">{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model Badge - responsive */}
          {assistantId && (
            <ModelBadge
              assistantId={assistantId}
              assistants={assistants}
              currentMode={currentMode}
              modelByMode={modelByMode}
            />
          )}
        </div>

        {/* Action Buttons - in a separate scrollable row */}
        <div className="px-3 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2 overflow-x-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs px-2 flex-shrink-0"
              onClick={async () => {
                  const activeAssistantId = assistantId || defaultAssistantByMode[currentMode];
                  if (!activeAssistantId) {
                    alert('어시스턴트를 먼저 선택하세요.');
                    return;
                  }
                  setSessionCreating(true);
                  try {
                    const name = `새 대화 ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
                    const created = await createChatSession(activeAssistantId, { name });
                    setSessionId(created.id);
                    setMessages([]);
                    hasExternalSession.current = true;
                    try { localStorage.removeItem(`hana_messages_${created.id}`); } catch {}
                  } catch (err: any) {
                    alert(err?.message || '새 세션 생성에 실패했습니다.');
                  } finally {
                    setSessionCreating(false);
                  }
                }}
                disabled={sessionCreating}
              >
                {sessionCreating ? '생성중...' : '새 세션'}
              </Button>
              {assistantId && sessionId && (
                <Button variant="destructive" size="sm" className="h-8 text-xs px-2 flex-shrink-0" onClick={handleDeleteSession}>
                  세션 삭제
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs px-2 flex-shrink-0 text-muted-foreground"
                onClick={handleContextRollback}
                disabled={messages.length < 2}
              >
                <Icon name="arrow-right" size={14} />
                되돌리기
              </Button>
            </div>
          </div>

        {/* Knowledge Base Dialog */}
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
                <Button onClick={() => { applySelectedKnowledgeBases(); setIsKBOpen(false); }} disabled={kbApplying}>
                  {kbApplying ? '적용 중...' : '선택 적용'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {kbToast && (
        <div className={cn(
          'px-4 pt-2 text-xs',
          kbToastType === 'error' ? 'text-destructive' : 'text-muted-foreground'
        )}>
          {kbToast}
        </div>
      )}

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
                  sources={message.sources}
                  onSourceClick={onSourceClick}
                />
                
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
