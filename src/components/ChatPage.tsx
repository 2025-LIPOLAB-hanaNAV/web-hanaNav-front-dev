import React, { useState, useRef, useEffect, memo } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { listDatasets, listChats, updateChat, updateChatSession, deleteChatSessions, createChatSession, type ChatAssistant, converseStream, converseOnce, createDataset, uploadDocuments, parseDocuments, deleteDatasets, createChat, deleteChats, getChatDetails, retrieveChunks } from '../services/ragflow';
import { requireConfig, RAGFLOW_ASSISTANT_PRECISE_ID, RAGFLOW_ASSISTANT_QUICK_ID, RAGFLOW_ASSISTANT_SUMMARY_ID, getRerankConfig } from '../config';
import { ChatBubble } from './ChatBubble';
import { AnswerCard } from './AnswerCard';
import { SearchBar } from './SearchBar';
// import { QualityDashboard } from './QualityDashboard';
import { Icon } from './ui/Icon';
import { cn } from './ui/utils';
import { HanaNaviLogo } from './ui/HanaNaviLogo';

// 단순한 인사말인지 판단하는 함수
function isSimpleGreeting(query: string): boolean {
  const greetings = ['안녕', '안녕하세요', '안녕하십니까', '하이', '히', '헬로', 'hello', 'hi', '여보세요', '반가워', '반갑습니다', '좋은 아침', '좋은 하루', '수고하세요'];
  const normalizedQuery = query.trim().toLowerCase().replace(/[!?.,]/g, '');
  return greetings.some(greeting => normalizedQuery.includes(greeting.toLowerCase()) && normalizedQuery.length <= greeting.length + 5);
}

// 일상대화인지 판단하는 함수 (지식베이스 없이 처리 가능한 질문들)
function isCasualConversation(query: string): boolean {
  const casualKeywords = [
    // 음식 관련
    '점심', '저녁', '아침', '메뉴', '맛집', '음식', '식사', '먹을', '배고', '배고픈', '밥', '식당',
    // 날씨 관련
    '날씨', '비', '눈', '더워', '추워', '덥', '춥', '햇살', '바람',
    // 일반 대화
    '어때', '어떻게', '뭐해', '뭐하', '안녕', '고마워', '감사', '괜찮', '좋아', '싫어',
    // 시간 관련
    '몇시', '시간', '언제', '오늘', '내일', '어제', '주말',
    // 기타 일상
    '취미', '여행', '쇼핑', '영화', '드라마', '음악', '게임', '운동', '건강'
  ];

  const normalizedQuery = query.trim().toLowerCase().replace(/[!?.,]/g, '');
  return casualKeywords.some(keyword => normalizedQuery.includes(keyword));
}

// 금융/은행 관련 질문인지 판단하는 함수
function isBankingQuery(query: string): boolean {
  const bankingKeywords = [
    // 은행 업무
    '계좌', '통장', '카드', '대출', '적금', '예금', '투자', '보험', '연금',
    '이체', '송금', '입금', '출금', '잔액', '한도', '수수료', '금리', '이자',
    // 은행 서비스
    '인터넷뱅킹', '모바일뱅킹', 'atm', '지점', '영업시간', '상담', '고객센터',
    // 금융 상품
    '적금', '예금', '펀드', '주식', '채권', '보험', '연금', '신탁',
    // 문제 상황
    '분실', '도난', '사고', '오류', '문의', '신고', '해지', '정지', '제한'
  ];

  const normalizedQuery = query.trim().toLowerCase();
  return bankingKeywords.some(keyword => normalizedQuery.includes(keyword));
}

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
  documentId?: string;
  highlightSnippet?: string;
  originalIndex?: number;
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
  onNavigateToKnowledgeBase?: (datasetId: string, docId?: string, chunkId?: string) => void;
  initialQuery?: string;
  initialFiles?: File[];
  onQueryProcessed?: () => void;
  onEvaluationResult?: (result: any) => void;
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

export function ChatPage({ onEvidenceClick, onSourceClick, onNavigateToKnowledgeBase, initialQuery, initialFiles, onQueryProcessed, onEvaluationResult, initialSession }: ChatPagePropsExtended) {
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

        // localStorage에서 먼저 메시지 복원 시도 (sources 정보 포함)
        let restoredFromLocalStorage = false;
        try {
          const raw = localStorage.getItem(`hana_messages_${initialSession.sessionId}`);
          if (raw) {
            const cached = JSON.parse(raw) as typeof messages;
            if (Array.isArray(cached) && cached.length > 0) {
              console.log('Loading messages from localStorage (with sources):', cached);
              setMessages(cached);
              restoredFromLocalStorage = true;
            }
          }
        } catch (e) {
          console.warn('Failed to load messages from localStorage:', e);
        }

        // localStorage에 없으면 세션 데이터에서 복원 (sources 정보 없을 수 있음)
        if (!restoredFromLocalStorage && initialSession.messages && initialSession.messages.length > 0) {
          const convertedMessages = initialSession.messages
            .filter(msg => (msg.content || '').trim().length > 0)
            .map((msg, index) => ({
              id: `${initialSession.sessionId}_msg_${index}`,
              type: msg.role === 'assistant' ? 'assistant' as const : 'user' as const,
              content: msg.content || '',
              timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
              state: 'success' as const,
              // sources 정보도 복원 (메시지 객체에 있으면)
              sources: (msg as any).sources,
              evidenceCount: (msg as any).evidenceCount,
              responseTime: (msg as any).responseTime,
              hasPII: (msg as any).hasPII,
              isEvidenceLow: (msg as any).isEvidenceLow
            }));

          console.log('Loading messages from session data (fallback):', convertedMessages);
          setMessages(convertedMessages);

          // 로컬 스토리지에도 저장
          try {
            localStorage.setItem(`hana_messages_${initialSession.sessionId}`, JSON.stringify(convertedMessages));
          } catch (e) {
            console.warn('Failed to save messages to localStorage:', e);
          }
        } else if (!restoredFromLocalStorage) {
          console.log('No messages found, setting empty array');
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
          dataset_ids: [dsId!], // 첨부파일 기반 채팅은 오직 첨부파일만 사용
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
        // 기존 임시 어시스턴트 업데이트 - 첨부파일만 사용
        try { await updateChat(eaId, { dataset_ids: [dsId!] }); } catch {}
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

  // 정밀검증 모드로 전환하는 함수
  const handleSwitchToPrecise = async () => {
    if (currentMode === 'precise') {
      alert('이미 정밀검증 모드입니다.');
      return;
    }

    const shouldSwitch = window.confirm('정밀검증 모드로 전환하시겠습니까?\n현재 대화 내역이 새로운 세션으로 복사됩니다.');

    if (shouldSwitch) {
      await handleModeChange('precise');
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
    { id: 'precise', name: '정밀검증', description: '상세 검증', icon: 'search' }
    // { id: 'summary', name: '요약전용', description: '핵심만', icon: 'file-text' } // 완성도 개선 후 재활성화 예정
  ];

  const modelByMode: Record<string, string> = {
    quick: 'gemma3:12b',
    precise: 'gpt-oss:latest',
    summary: 'gemma3:12b',
  };

  const defaultAssistantByMode: Record<string, string | undefined> = {
    quick: RAGFLOW_ASSISTANT_QUICK_ID,
    precise: RAGFLOW_ASSISTANT_PRECISE_ID,
    summary: RAGFLOW_ASSISTANT_SUMMARY_ID,
  };

  // 어시스턴트별 프롬프트 정의
  const assistantPrompts = {
    quick: {
      general: {
        prompt: `당신은 "빠른별돌이"라는 이름의 친근한 AI 어시스턴트입니다 🌙

빠른별돌이는 별처럼 반짝이며 빠르게 핵심을 알려주는 친구 같은 어시스턴트예요.
사용자와 자연스럽고 친근한 대화를 나누며, 질문에 대해 가능한 한 빠르고 간결하게 답변합니다.

🚫 **중요한 제약사항 (절대 위반 금지):**
- 확실하지 않은 사실은 절대 지어내지 마세요
- 구체적인 기업명, 인명, 사건명 등을 임의로 만들어내지 마세요
- 정확하지 않은 수치나 날짜를 추측해서 말하지 마세요
- 모르는 것은 솔직히 "잘 모르겠어요" 라고 하세요

기본 원칙:
1. 인사나 일상 대화에는 자연스럽고 친근하게 응답하세요.
2. 일반적인 질문에는 확실한 상식만 활용해 도움을 주세요.
3. 전문적이거나 구체적인 정보가 필요한 경우 솔직히 "정확한 정보는 확인이 어려워요 🌙"라고 말하세요.
4. 답변은 항상 짧고 명확한 문단(1~3문장)으로 작성하세요.
5. 친근하고 따뜻한 톤을 유지하되, 과도하게 길지 않게 답변하세요.
6. **불확실한 내용은 절대 지어내지 말고 "모르겠어요"라고 정직하게 답하세요**

🌟 정직하고 신뢰할 수 있는 답변만 드리겠습니다`,
        opener: "🌟 안녕하세요! 빠른별돌이입니다. 무엇을 도와드릴까요?"
      },
      rag: {
        prompt: `당신은 "빠른별돌이"라는 이름의 금융 문서 전문 AI 어시스턴트입니다 🌙

아래 제공된 지식베이스는 하나은행의 공식 문서, 정책, 규정에서 추출한 정확한 내용입니다.

📚 **지식베이스:**
{knowledge}

🔒 **절대 준수 규칙 (위반 시 답변 거부)**
1. **원문 그대로 인용**: 지식베이스의 문장을 정확히 따옴표로 묶어 인용하세요
2. **추론 및 해석 금지**: 문서에 명시되지 않은 내용은 절대 추가하지 마세요
3. **일반상식 사용 금지**: 외부 지식이나 상식으로 보완하지 마세요

📋 **정확한 답변 형식:**

**질문에 대한 직접적 답변:**
지식베이스에 따르면 "[원문을 정확히 그대로 인용]"라고 명시되어 있습니다.

**구체적 세부사항 (있는 경우만):**
- **[항목1]:** "[관련 원문 인용]"
- **[항목2]:** "[관련 원문 인용]"

**한계 명시:**
지식베이스에는 [구체적인 추가 정보]에 대한 내용은 포함되어 있지 않습니다.

**출처 표시:** 인용한 내용마다 [1], [2] 형태로 출처 번호 표시

⚠️ **금지사항:**
- "일반적으로", "보통", "대개" 등의 표현 사용 금지
- 문서에 없는 배경 설명이나 해석 추가 금지
- 여러 문서의 내용을 임의로 조합하여 새로운 의미 생성 금지

🌟 오직 문서에 명시된 사실만을 정확히 전달드리겠습니다!`,
        opener: "🌟 하나은행 공식 문서를 기반으로 정확한 답변을 드리는 빠른별돌이입니다!"
      }
    },
    precise: {
      general: {
        prompt: `당신은 "정밀한별"이라는 이름의 전문적인 AI 어시스턴트입니다 🔍

정밀한별은 정확성과 신뢰성을 최우선으로 하는 전문가 수준의 어시스턴트입니다.
모든 답변을 면밀히 검토하고, 다각도로 분석하여 가장 정확한 정보를 제공합니다.

⛔ **엄격한 사실 검증 원칙:**
- 확실하지 않은 사실은 절대 추측하지 않습니다
- 구체적인 기업명, 인명, 사건, 날짜는 확실할 때만 언급합니다
- "추측", "예상", "일반적으로" 등의 표현으로 불확실한 정보를 제공하지 않습니다
- 모르는 것은 명확히 "확인할 수 없습니다"라고 답합니다

기본 원칙:
1. 모든 답변은 다단계 검증을 거쳐 정확성을 확보합니다.
2. 불확실한 정보는 절대 추측하지 않고 "확인이 필요합니다"라고 명시합니다.
3. 복잡한 문제는 단계별로 분석하여 체계적으로 설명합니다.
4. 답변 시 근거와 논리를 명확히 제시합니다.
5. 필요시 추가 확인이나 검증 방법을 안내합니다.
6. **확실하지 않은 내용은 절대 답하지 않습니다**

🔍 검증된 정보만을 제공하여 신뢰성을 보장하겠습니다`,
        opener: "🔍 안녕하세요! 정밀한별입니다. 정확한 검증이 필요한 질문을 말씀해 주세요."
      },
      rag: {
        prompt: `당신은 "정밀한별"이라는 이름의 법률/금융 문서 전문 검증 AI 어시스턴트입니다 🔍

아래 지식베이스는 하나은행의 공식 규정, 법률 문서, 정책에서 추출한 법적 효력을 가진 정확한 내용입니다.

📚 **지식베이스:**
{knowledge}

🔒 **극도로 엄격한 사실 검증 규칙**
1. **문자 그대로 인용**: 한 글자도 바꾸지 말고 원문 그대로 인용
2. **해석 완전 금지**: 문서 내용에 대한 어떠한 해석이나 의미 부여도 금지
3. **추론 절대 금지**: "~것으로 보임", "~추정됨" 등 추론성 표현 절대 금지

📋 **정밀 검증 답변 형식:**

**핵심 답변:**
질문하신 내용에 대해 지식베이스에는 정확히 다음과 같이 명시되어 있습니다:

"[원문을 한 글자도 바꾸지 않고 그대로 인용]" [출처번호]

**추가 관련 조항 (있는 경우만):**
- "[관련 원문 1]" [출처번호]
- "[관련 원문 2]" [출처번호]

**검증 결과:**
지식베이스에서 확인된 내용은 위가 전부이며, 추가적인 해석이나 설명은 문서에 포함되어 있지 않습니다.

⚠️ **절대 금지사항:**
- 문서 내용의 의미나 의도 해석
- "이는 ~를 의미합니다" 같은 설명 추가
- 법적/금융적 조언이나 개인 의견 제시
- 여러 조항을 연결해서 새로운 결론 도출

🔍 오직 문서에 명시된 조문과 규정만을 정확히 제시하겠습니다`,
        opener: "🔍 정밀한별입니다! 법률/금융 문서의 정확한 조문만을 제시해 드리겠습니다."
      }
    },
    summary: {
      general: {
        prompt: `당신은 "요약달님"이라는 이름의 요약 전문 AI 어시스턴트입니다 📝

요약달님은 복잡한 정보를 핵심만 뽑아 간결하고 이해하기 쉽게 전달하는 전문가입니다.
긴 내용도 핵심 포인트만 추려 명확하게 정리합니다.

기본 원칙:
1. 모든 답변은 핵심 내용만 간추려 3줄 이내로 요약합니다.
2. 중요도에 따라 우선순위를 매겨 정보를 정리합니다.
3. 불필요한 세부사항은 제거하고 본질만 전달합니다.
4. 복잡한 개념도 쉬운 표현으로 요약합니다.
5. 필요시 핵심 키워드나 요점을 번호로 정리합니다.

📝 복잡한 내용도 핵심만 뽑아 명쾌하게 정리해 드리겠습니다`,
        opener: "📝 안녕하세요! 요약달님입니다. 정리가 필요한 내용을 말씀해 주세요."
      },
      rag: {
        prompt: `당신은 "요약달님"이라는 이름의 요약 전문 챗봇입니다 📝
요약달님은 방대한 문서에서 핵심만 뽑아 간결하게 정리하는 전문가입니다.

**지식베이스 기반 요약 필수 규칙**
1. 아래 {knowledge}는 검증된 원본 문서에서 추출한 정확한 내용입니다.
2. 질문과 관련된 내용이 {knowledge}에 있다면 **반드시 이 내용만을 기반**으로 요약하세요.
3. {knowledge} 외의 일반 지식이나 추측은 **절대 사용하지 마세요**.
4. 요약 시 원본 문서의 핵심 내용을 왜곡하지 말고 정확히 압축하세요.
5. 모든 요약은 3-5개의 핵심 포인트로 압축하고 출처를 명시합니다.
6. {knowledge}에 관련 정보가 없으면 "제공된 문서에서 관련 정보를 찾을 수 없습니다"라고 안내합니다.

**원본 문서 내용 (요약 기준):**
{knowledge}

위 문서 내용이 질문과 관련이 있다면 반드시 이 정보만을 정확히 요약해주세요! 📝`,
        opener: "📝 요약달님입니다! 복잡한 문서 내용을 핵심만 뽑아 정리해 드리겠습니다."
      }
    }
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

      if (created.messages && created.messages.length > 0) {
        const initialTimestamp = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        const seedMessages: ChatMessage[] = created.messages
          .map((msg, index) => ({
            id: `${created.id}_seed_${index}`,
            type: msg.role,
            content: (msg.content || '').trim(),
            timestamp: initialTimestamp,
            state: 'success' as const,
          }))
          .filter(msg => msg.content.length > 0);

        if (seedMessages.length > 0) {
          setMessages(prev => {
            const existingContents = new Set(prev.map(m => m.content.trim()));
            const deduped = seedMessages.filter(msg => !existingContents.has(msg.content));
            if (deduped.length === 0) return prev;
            return [...deduped, ...prev];
          });
        }
      }

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
        // 첨부파일 기반 채팅에서는 오직 첨부파일만 사용
        const ids = ephemeralDatasetId ? [ephemeralDatasetId] : [];
        // 지식베이스만 업데이트 (프롬프트는 유지)
        await updateChat(activeAssistantId, {
          dataset_ids: ids
        });
      } else {
        // 현재 어시스턴트 모드에 따른 프롬프트 선택
        const getAssistantPrompts = () => {
          // 어시스턴트 ID로 모드 확인
          if (activeAssistantId === defaultAssistantByMode.precise) {
            return assistantPrompts.precise;
          } else if (activeAssistantId === defaultAssistantByMode.summary) {
            return assistantPrompts.summary;
          } else {
            return assistantPrompts.quick; // 기본값
          }
        };

        const modePrompts = getAssistantPrompts();

        // 일반 어시스턴트는 지식베이스와 프롬프트를 동적으로 변경
        const promptConfig = selectedKBs.length === 0 ? {
          // 일상대화용 프롬프트 (knowledge 변수 없음)
          prompt: modePrompts.general.prompt,
          opener: modePrompts.general.opener,
          empty_response: "",
          show_quote: false,
          variables: []
        } : {
          // 지식베이스용 프롬프트 (knowledge 변수 포함)
          prompt: modePrompts.rag.prompt,
          opener: modePrompts.rag.opener,
          empty_response: "",
          show_quote: true,
          variables: [{ key: "knowledge", optional: true }]
        };

        console.log('🔍 지식베이스 적용:', {
          assistantId: activeAssistantId,
          selectedKBs,
          dataset_ids: selectedKBs,
          promptMode: selectedKBs.length === 0 ? '일상대화용' : '지식베이스용'
        });

        console.log('🔧 어시스턴트 업데이트 전송 중:', {
          assistantId: activeAssistantId,
          dataset_ids: selectedKBs,
          prompt: promptConfig
        });

        await updateChat(activeAssistantId, {
          dataset_ids: selectedKBs,
          prompt: promptConfig
        });

        console.log('✅ 어시스턴트 업데이트 완료');

        // 업데이트 후 실제 설정 확인
        try {
          const chatDetails = await getChatDetails(activeAssistantId);
          console.log('🔍 어시스턴트 현재 설정:', {
            dataset_ids: chatDetails.dataset_ids,
            prompt: chatDetails.prompt,
            name: chatDetails.name
          });
        } catch (err) {
          console.debug('⚠️ 어시스턴트 설정 확인 실패 (무시 가능):', err);
        }

        // 지식베이스가 설정되었는데도 프롬프트가 업데이트되지 않은 경우 강제 리셋
        if (selectedKBs.length > 0) {
          console.log('🔄 지식베이스용 프롬프트 강제 재설정 시도...');
          try {
            await updateChat(activeAssistantId, {
              prompt: {
                prompt: modePrompts.rag.prompt,
                opener: modePrompts.rag.opener,
                empty_response: "",
                show_quote: true,
                variables: [{ key: "knowledge", optional: true }]
              }
            });
            console.log('✅ 강제 프롬프트 재설정 완료');
          } catch (err) {
            console.error('❌ 강제 프롬프트 재설정 실패:', err);
          }
        }
      }

      if (isEphemeral) {
        setKbToast('첨부파일 기반 채팅으로 설정되었습니다.');
      } else {
        setKbToast(selectedKBs.length === 0 ? '지식베이스 연결이 해제되었습니다.' : `${selectedKBs.length}개 지식베이스가 연결되어 자동으로 설정되었습니다.`);
      }
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

    const preprocessMarkdownText = (text: string, sourceIndexMap?: Map<number, number>): string => {
      console.log('🔧 전처리 시작 원본 텍스트:', text.substring(0, 200) + '...');

      let cleaned = text;

      const remapIndex = (originalIndex: number): number => {
        if (!sourceIndexMap) return originalIndex;
        const mapped = sourceIndexMap.get(originalIndex);
        return mapped !== undefined ? mapped : originalIndex;
      };

      // 1. 기본 HTML 태그를 마크다운으로 변환
      cleaned = cleaned
        .replace(/<em>/g, '*')
        .replace(/<\/em>/g, '*')
        .replace(/<strong>/g, '**')
        .replace(/<\/strong>/g, '**')
        .replace(/<b>/g, '**')
        .replace(/<\/b>/g, '**')
        .replace(/<i>/g, '*')
        .replace(/<\/i>/g, '*');

      // 2. 특수 케이스 먼저 처리: .** 패턴 수정
      // .** → **  (점과 볼드 태그 사이 정리)
      cleaned = cleaned.replace(/\.\*\*/g, '. **');

      // 문장 끝의 점과 볼드 시작 사이에 공백 추가
      cleaned = cleaned.replace(/\.([가-힣A-Za-z])/g, '. $1');

      // 3. 깨진 마크다운 태그 수정
      // **텍스트*로 끝나는 경우 → **텍스트**로 수정
      cleaned = cleaned.replace(/\*\*([^*]+?)\*(?!\*)/g, '**$1**');

      // *텍스트**로 끝나는 경우 → **텍스트**로 수정
      cleaned = cleaned.replace(/(?<!\*)\*([^*]+?)\*\*/g, '**$1**');

      // 연속된 볼드 태그 정리: ****텍스트**** → **텍스트**
      cleaned = cleaned.replace(/\*{3,}([^*]+?)\*{3,}/g, '**$1**');

      // 4. 공백과 문장 사이 정리
      // 연속된 공백을 하나로
      cleaned = cleaned.replace(/ {2,}/g, ' ');

      // 볼드 텍스트 뒤에 바로 오는 텍스트 사이에 공백 추가
      cleaned = cleaned.replace(/(\*\*[^*]+?\*\*)([가-힣A-Za-z])/g, '$1 $2');

      // 콜론 뒤에 공백 추가
      cleaned = cleaned.replace(/(\*\*[^*]*?:\*\*)([^\s])/g, '$1 $2');

      // 물음표 뒤에 공백 추가
      cleaned = cleaned.replace(/(\?[^가-힣A-Za-z\s])([가-힣A-Za-z])/g, '$1 $2');

      // 5. 출처 링크 제거 - 모든 출처 패턴을 텍스트에서 완전 제거
      console.log('🔗 출처 링크 제거 전 텍스트:', cleaned.substring(0, 300));

      // RAGFlow에서 나오는 모든 출처 패턴들을 제거:

      // 1. 숫자(#source-숫자) 형태 제거
      cleaned = cleaned.replace(/\d+\s*\(\s*#source\s*[-_]?\s*\d+\s*\)/g, '');

      // 2. 숫자 #source-숫자 형태 (괄호 없이) 제거
      cleaned = cleaned.replace(/\d+\s*#source\s*[-_]?\s*\d+/g, '');

      // 3. 고립된 (#source-숫자) 형태 제거
      cleaned = cleaned.replace(/\(\s*#source\s*[-_]?\s*\d+\s*\)/g, '');

      // 4. [ID:숫자] 형태 제거
      cleaned = cleaned.replace(/\[ID:\d+\]/g, '');

      // 5. ID:숫자 형태 제거
      cleaned = cleaned.replace(/\bID:\d+\b/g, '');

      // 6. [숫자](#source-숫자) 형태 제거 (완전한 링크 패턴)
      cleaned = cleaned.replace(/\[\d+\]\(#source-\d+\)/g, '');

      // 7. [숫자] 형태 제거
      cleaned = cleaned.replace(/\[\d+\]/g, '');

      // 8. 복합 패턴 제거: [숫자](#source-숫자)(#source-숫자)
      cleaned = cleaned.replace(/\[\d+\]\(#source-\d+\)\(#source-\d+\)/g, '');

      // 9. (숫자) 형태 제거 - 단, 년도나 일반적인 괄호 숫자는 보존
      cleaned = cleaned.replace(/\((\d+)\)/g, (match, num) => {
        const parsed = parseInt(num, 10);
        // 년도(1900-2100) 또는 일반적인 번호 체계는 보존
        if (parsed >= 1900 && parsed <= 2100) return match;
        if (parsed > 100) return match; // 큰 숫자는 일반 숫자로 판단
        return ''; // 작은 숫자는 출처 번호로 판단하여 제거
      });

      // 10. 출처 링크 제거 후 남은 불필요한 공백 정리
      cleaned = cleaned.replace(/\s{2,}/g, ' '); // 연속 공백을 하나로
      cleaned = cleaned.replace(/\s+([,.!?])/g, '$1'); // 구두점 앞 공백 제거

      console.log('🔗 출처 링크 제거 후 텍스트:', cleaned.substring(0, 300));

      // 6. 리스트 포맷팅 개선
      // 숫자 리스트 패턴 정리
      cleaned = cleaned.replace(/([^\n])(\d+)\.\s*\*\*/g, '$1\n\n$2. **');

      // 볼드 콜론 패턴 정리
      cleaned = cleaned.replace(/\*\*([^*]+?):\*\*/g, '**$1:**');

      // 7. 가독성 개선을 위한 문단 및 줄바꿈 정리

      // 문장 끝에 적절한 줄바꿈 추가 (가독성 향상)
      cleaned = cleaned.replace(/([.!?])\s*([가-힣A-Za-z])/g, '$1\n\n$2');

      // 볼드 제목 뒤에 줄바꿈 추가
      cleaned = cleaned.replace(/(\*\*[^*]+\*\*)\s*([가-힣A-Za-z])/g, '$1\n$2');

      // 리스트 항목 사이에 적당한 간격
      cleaned = cleaned.replace(/(\d+\.\s[^\n]+)\s*(\d+\.)/g, '$1\n\n$2');

      // 여러 줄바꿈을 두 개로 제한 (단락 구분 유지)
      cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

      // 콜론 뒤에 줄바꿈 추가 (설명 구조 개선)
      cleaned = cleaned.replace(/(\*\*[^*]*:\*\*)\s*([가-힣A-Za-z])/g, '$1\n$2');

      // 8. 최종 정리
      // 앞뒤 공백 제거
      cleaned = cleaned.trim();

      // 연속된 공백 최종 정리 (단, 줄바꿈은 유지)
      cleaned = cleaned.replace(/[^\S\n]{2,}/g, ' ');

      console.log('🔧 전처리 완료:', cleaned.substring(0, 200) + '...');
      return cleaned;
    };

    const mapChunksToSources = (chunks: any[] = []): SourceReference[] => {
      console.log('🔍 원본 chunks 데이터:', chunks);
      return chunks
        .filter(Boolean)
        .map((chunk, index) => {
          // ID 추출 개선 - 다양한 필드에서 시도하면서 문자열로 일관화
          const chunkIdRaw = chunk?.chunk_id || chunk?.id || chunk?.chunk?.id || `fallback_${index}`;
          const datasetIdRaw = chunk?.dataset_id || chunk?.datasetId || chunk?.dataset?.id || chunk?.kb_id;

          // 문서 ID 추출 개선 - 다양한 필드에서 시도하면서 문자열로 일관화
          const documentIdRaw = chunk?.document_id || chunk?.documentId || chunk?.document?.id ||
                           chunk?.doc_id || chunk?.file_id || chunk?.document_uuid;

          const chunkId = chunkIdRaw != null ? String(chunkIdRaw) : `fallback_${index}`;
          const datasetId = datasetIdRaw != null ? String(datasetIdRaw) : (selectedKBs[0] ?? '');
          const documentId = documentIdRaw != null ? String(documentIdRaw) : undefined;

          console.log(`🔍 청크 ${index} ID 매핑:`, {
            chunkId,
            datasetId,
            documentId,
            originalFields: {
              chunk_id: chunk?.chunk_id,
              id: chunk?.id,
              dataset_id: chunk?.dataset_id,
              document_id: chunk?.document_id,
              documentId: chunk?.documentId
            }
          });

          // 데이터셋 이름 추출 시도 - 실제 선택된 지식베이스 이름 우선 사용
          let datasetName = chunk?.dataset_name || chunk?.datasetName || chunk?.dataset?.name ||
                           chunk?.kb_name || chunk?.knowledge_base_name;

          // 실제 선택된 지식베이스 이름으로 매핑
          if (!datasetName || datasetName.startsWith('데이터셋')) {
            const matchedKB = knowledgeBases.find(kb =>
              kb.id === datasetId || kb.id === chunk?.dataset_id || kb.id === chunk?.datasetId
            );
            datasetName = matchedKB?.name || `데이터셋 ${index + 1}`;
          }

          // 문서 제목 추출 및 길이 제한 - document_keyword 필드 우선 사용
          let rawTitle = chunk?.document_keyword || chunk?.document_name || chunk?.doc_name ||
                        chunk?.document_title || chunk?.file_name || chunk?.title || chunk?.name ||
                        chunk?.document?.name || chunk?.document?.title;

          // 확장자 제거 및 정리
          if (rawTitle && rawTitle !== `문서 ${index + 1}`) {
            rawTitle = rawTitle.replace(/\.(pdf|doc|docx|txt|md)$/i, '');
          } else {
            rawTitle = `문서 ${index + 1}`;
          }

          const title = rawTitle.length > 50 ? rawTitle.substring(0, 47) + '...' : rawTitle;

          const content = (
            chunk?.highlight_text ||
            chunk?.highlight ||
            chunk?.content_with_weight ||
            chunk?.content ||
            ''
          ).toString();

          console.log(`✅ 매핑 완료 - 소스 ${index}:`, {
            id: `source_${index}`,
            title,
            datasetName,
            datasetId,
            documentId,
            chunkId,
            similarity: chunk?.similarity ?? chunk?.score
          });

          return {
            id: `source_${index}`, // 인덱스 기반으로 일관성 있게 설정
            title,
            content,
            datasetId,
            datasetName,
            chunkId,
            similarity: chunk?.similarity ?? chunk?.score,
            documentId,
            highlightSnippet: chunk?.highlight || chunk?.highlight_text,
            originalIndex: index,
          } satisfies SourceReference;
        });
    };

    const normalizeSourcesBySimilarity = (refs: SourceReference[]) => {
      if (!Array.isArray(refs) || refs.length === 0) {
        return {
          normalized: [] as SourceReference[],
          indexMap: new Map<number, number>()
        };
      }

      const scoreOf = (ref: SourceReference): number => {
        if (typeof ref.similarity === 'number') return ref.similarity;
        return -Infinity;
      };

      const sorted = [...refs].sort((a, b) => scoreOf(b) - scoreOf(a));
      const indexMap = new Map<number, number>();
      const normalized = sorted.map((source, newIndex) => {
        const originalIndex = source.originalIndex ?? newIndex;
        indexMap.set(originalIndex, newIndex);
        return {
          ...source,
          id: `source_${newIndex}`,
        } satisfies SourceReference;
      });

      return { normalized, indexMap };
    };

    try {
      const ephemeralId = await ensureEphemeralContext(files);
      const activeAssistantId = ephemeralId || assistantId || defaultAssistantByMode[currentMode];
      if (!activeAssistantId) throw new Error('어시스턴트를 선택하거나 기본 ID를 설정하세요.');

      const desiredName = query.slice(0, 80) || '새 대화';
      const ensuredSessionId = await ensureSession(activeAssistantId, desiredName);

      // 새 세션에서는 인사말을 미리 추가하지 않음 (응답 순서 혼란 방지)

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

      // 일상대화 감지 및 처리
      const isCasual = isCasualConversation(query);
      const isBanking = isBankingQuery(query);
      const shouldUseKnowledgeBase = selectedKBs.length > 0 && (isBanking || !isCasual);

      console.log(`🤖 Query analysis:`, {
        query: query.substring(0, 50) + '...',
        isCasual,
        isBanking,
        hasSelectedKBs: selectedKBs.length > 0,
        shouldUseKnowledgeBase
      });

      // RAGFlow 네이티브 스트리밍 API 사용 (reference 정보 포함)
      const result = await converseOnce(
        activeAssistantId,
        {
          question: query,
          session_id: ensuredSessionId,
          stream: true, // 스트리밍 활성화
          // 검색 품질 개선 파라미터 적용
          ...(shouldUseKnowledgeBase ? {
            // 지식베이스가 있고 은행 관련 질문일 때: 정확성 중심 파라미터
            similarity_threshold: 0.25, // 더 엄격한 임계값으로 고품질 문서만 선택
            vector_similarity_weight: 0.8, // 벡터 유사도 비중 증가
            top_k: 20, // 상위 20개만 선택하여 품질 향상
            keyword: true,
            temperature: 0.05, // 매우 낮은 온도로 일관성 있는 답변
            max_tokens: 600, // 간결하고 정확한 답변
            ...getRerankConfig() // 환경변수로 제어되는 리랭커 설정
          } : {
            // 일상대화 모드: 지식베이스 사용하지 않고 자연스럽게 대화
            temperature: isCasual ? 0.7 : 0.3,
            top_k: 0,
            max_tokens: 500
          })
        },
        {
          onMessage: (partial) => {
            if (partial.answer) {
              updateAssistantContent(partial.answer);
              latestAnswer = partial.answer;
            }
            if (partial.reference) {
              latestReference = partial.reference;
              console.log('📚 스트리밍 중 reference 정보 수신:', partial.reference);
            }
            if (partial.session_id) {
              latestSessionId = partial.session_id;
            }
          }
        }
      );

      console.log('RAGFlow converseOnce result:', result);

      // Update variables for compatibility with existing code - undefined 처리
      latestAnswer = result?.answer || latestAnswer || '';
      latestReference = result?.reference || latestReference;
      latestSessionId = result?.session_id || latestSessionId;

      const dt = (Date.now() - t0) / 1000;
      const effectiveAnswer = result?.answer ?? latestAnswer;
      let effectiveReference = result?.reference ?? latestReference;
      const effectiveSessionId = result?.session_id ?? latestSessionId;

      if (effectiveSessionId && !sessionId) {
        setSessionId(effectiveSessionId);
        const name = query.slice(0, 80);
        try { await updateChatSession(activeAssistantId, effectiveSessionId, { name }); } catch {}
      }

      let sources: SourceReference[] = mapChunksToSources(effectiveReference?.chunks);

      // 멀티턴 대화에서 출처 정보 강화: 지식베이스가 선택되어 있고 은행 관련 질문이면 항상 출처 검색
      const needsSourceEnforcement = selectedKBs.length > 0 && shouldUseKnowledgeBase && sources.length === 0;

      if (needsSourceEnforcement) {
        try {
          console.log('🔍 멀티턴 대화에서 출처 정보 없음 - 강제 검색 실행...');
          const fallback = await retrieveChunks({
            question: query,
            dataset_ids: selectedKBs,
            page: 1,
            page_size: 6, // 더 엄선된 결과만
            top_k: 15, // 상위 15개만 검토
            highlight: true,
            keyword: true,
            similarity_threshold: 0.3, // 멀티턴에서도 높은 품질 유지
            vector_similarity_weight: 0.8, // 벡터 유사도 중심
            ...getRerankConfig() // 환경변수로 제어되는 리랭커 설정,
          });
          if (fallback?.chunks?.length) {
            console.log('✅ 멀티턴 출처 정보 강제 로드 완료:', fallback.chunks.length, '개');
            effectiveReference = {
              ...(effectiveReference || {}),
              chunks: fallback.chunks,
              total: fallback.total,
              fallback_source: 'multiturn_enforcement',
            };
            latestReference = effectiveReference;
            sources = mapChunksToSources(fallback.chunks);

            // 멀티턴에서 강제 검색된 출처를 답변에 추가 (1-based 표시)
            if (sources.length > 0) {
              const sourceLinks = sources.map((source, index) => {
                console.log(`📎 출처 링크 생성 ${index}:`, {
                  sourceId: source.id,
                  datasetId: source.datasetId,
                  documentId: source.documentId,
                  title: source.title
                });
                // 1-based 표시 ([1], [2], [3]...)하지만 href는 0-based 인덱스 유지
                return `[${index + 1}](#source-${index})`;
              }).join(' ');
              if (effectiveAnswer && !effectiveAnswer.includes('[')) {
                effectiveAnswer = effectiveAnswer + ` ${sourceLinks}`;
                console.log('📎 멀티턴 답변에 출처 링크 추가:', sourceLinks);
              }
            }
          }
        } catch (fallbackError) {
          console.warn('⚠️ 멀티턴 출처 정보 강제 로드 실패:', fallbackError);
        }
      }

      // 기존 fallback 로직도 유지 (RAGFlow 자체에서 reference가 없는 경우)
      else if (sources.length === 0 && selectedKBs.length > 0 && !effectiveReference?.chunks && shouldUseKnowledgeBase) {
        try {
          console.log('🔍 Reference 정보 없음 - 일반 fallback 검색 실행...');
          const fallback = await retrieveChunks({
            question: query,
            dataset_ids: selectedKBs,
            page: 1,
            page_size: 10,
            top_k: 30,
            highlight: true,
            keyword: true,
            similarity_threshold: 0.1,
            vector_similarity_weight: 0.5,
            ...getRerankConfig()
          });
          if (fallback?.chunks?.length) {
            console.log('✅ 일반 Fallback 출처 정보 로드 완료:', fallback.chunks);
            effectiveReference = {
              ...(effectiveReference || {}),
              chunks: fallback.chunks,
              total: fallback.total,
              fallback_source: 'manual_retrieval',
            };
            latestReference = effectiveReference;
            sources = mapChunksToSources(fallback.chunks);
          }
        } catch (fallbackError) {
          console.warn('⚠️ Fallback 출처 정보 로드 실패:', fallbackError);
        }
      }

      const evidenceCount = effectiveReference?.chunks?.length || effectiveReference?.total || 0;

      console.log('RAG Response Debug:', {
        reference: effectiveReference,
        chunks: effectiveReference?.chunks,
        sources
      });

      let sourceIndexMap: Map<number, number> | undefined;
      if (sources.length > 0) {
        const { normalized, indexMap } = normalizeSourcesBySimilarity(sources);
        sources = normalized;
        sourceIndexMap = indexMap;

        if (effectiveReference?.chunks?.length) {
          const scoreOf = (chunk: any): number => {
            if (typeof chunk?.similarity === 'number') return chunk.similarity;
            if (typeof chunk?.score === 'number') return chunk.score;
            return -Infinity;
          };
          const sortedChunks = [...effectiveReference.chunks].sort((a, b) => scoreOf(b) - scoreOf(a));
          effectiveReference = {
            ...(effectiveReference || {}),
            chunks: sortedChunks,
          };
          latestReference = effectiveReference;
        }
      }

      let answerToRender = (effectiveAnswer || '').trim();
      let usedTopSourceFallback = false;

      if (!answerToRender) {
        if (sources.length > 0) {
          const topSource = sources[0];
          const snippetSource = topSource.highlightSnippet || topSource.content;
          const plainSnippet = typeof snippetSource === 'string'
            ? snippetSource.replace(/<[^>]*>/g, '').trim()
            : snippetSource?.toString().replace(/<[^>]*>/g, '').trim();
          if (plainSnippet) {
            const trimmedSnippet = plainSnippet.length > 300 ? `${plainSnippet.slice(0, 297)}...` : plainSnippet;
            answerToRender = `출처 요약:\n\n${trimmedSnippet}\n\n[1]`;
            usedTopSourceFallback = true;
            console.log('📌 최고 유사도 출처 보강: 답변이 없어 출처 스니펫으로 대체');
          }
        }

        if (!answerToRender) {
          answerToRender = '응답이 비어 있습니다.';
        }
      }

      const finalContent = preprocessMarkdownText(answerToRender, sourceIndexMap);

      let adjustedContent = finalContent;
      if (!usedTopSourceFallback && sources.length > 0 && !adjustedContent.includes('#source-0')) {
        const topSource = sources[0];
        const snippetSource = topSource.highlightSnippet || topSource.content;
        const plainSnippet = typeof snippetSource === 'string'
          ? snippetSource.replace(/<[^>]*>/g, '').trim()
          : snippetSource?.toString().replace(/<[^>]*>/g, '').trim();
        if (plainSnippet) {
          const trimmedSnippet = plainSnippet.length > 200 ? `${plainSnippet.slice(0, 197)}...` : plainSnippet;
          adjustedContent = `${adjustedContent}\n\n> ${trimmedSnippet} [1](#source-0)`;
          console.log('📌 최고 유사도 출처 보강: 자동 요약 추가');
        }
      }

      // 메시지 최종 업데이트 (스트리밍 완료 + 출처 정보 포함)
      setMessages(prev =>
        prev.map(msg =>
          msg.id === loadingMessageId
            ? {
                ...msg,
                content: adjustedContent,
                timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
                state: 'success',
                evidenceCount: Number(evidenceCount) || undefined,
                responseTime: dt,
                hasPII: false,
                isEvidenceLow: selectedKBs.length > 0 && currentMode === 'quick' && sources.length === 0 && (!evidenceCount || evidenceCount < 2) && !isSimpleGreeting(query),
                sources: sources.length > 0 ? sources : undefined
              }
            : msg
        )
      );

      console.log('📋 최종 메시지 업데이트 완료:', {
        sources: sources.length,
        evidenceCount,
        hasKnowledgeBase: selectedKBs.length > 0,
        isEvidenceLow: selectedKBs.length > 0 && currentMode === 'quick' && sources.length === 0 && (!evidenceCount || evidenceCount < 2) && !isSimpleGreeting(query)
      });
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
      // 홈에서 온 검색은 새 세션으로 시작
      if (!initialSession) {
        setSessionId(undefined);  // 기존 세션 초기화
        hasExternalSession.current = false;
        setSelectedKBs([]);  // 지식베이스 선택 초기화 - 새 세션은 일상대화 모드로 시작
      }
      handleSearch(initialQuery, initialFiles);
      onQueryProcessed?.();
    }
  }, [initialQuery, initialFiles, initialSession]);

  // 새 세션 생성 시 지식베이스 선택 초기화
  useEffect(() => {
    // sessionId가 없거나 변경되면 지식베이스 선택 초기화
    if (!sessionId || (sessionId && messages.length === 0)) {
      setSelectedKBs([]);
    }
  }, [sessionId, messages.length]);

  const handleRetry = () => {
    // Implement retry logic
  };

  const toggleKB = (id: string) => {
    setSelectedKBs(prev => {
      const newKBs = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      // 자동 적용 (선택사항)
      // setTimeout(() => applySelectedKnowledgeBases(), 500);
      return newKBs;
    });
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

  const handleModeChange = async (newMode: string) => {
    if (newMode === currentMode) return;

    // 기존 대화가 있는 경우에만 복사
    if (messages.length > 0) {
      const shouldCopy = window.confirm('모델을 변경하면 새 세션이 시작됩니다. 기존 대화를 복사하시겠습니까?');

      if (shouldCopy) {
        try {
          // 새로운 어시스턴트 ID 가져오기
          const newAssistantId = defaultAssistantByMode[newMode];
          if (!newAssistantId) {
            alert('선택한 모델의 어시스턴트를 찾을 수 없습니다.');
            return;
          }

          // 새 세션 생성
          const sessionName = `${chatModes.find(m => m.id === newMode)?.name} 대화 ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
          const newSession = await createChatSession(newAssistantId, { name: sessionName });

          // 기존 메시지를 새 세션용으로 변환 (인사말 제거)
          const copiedMessages = messages
            .filter(msg => msg.type !== 'system') // 시스템 메시지 제거
            .map((msg, index) => ({
              ...msg,
              id: `${newSession.id}_msg_${index}`,
              timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
            }));

          // 상태 업데이트
          setCurrentMode(newMode);
          setAssistantId(newAssistantId);
          setSessionId(newSession.id);
          setMessages(copiedMessages);
          hasExternalSession.current = true;

          // 로컬 스토리지에 저장
          try {
            localStorage.setItem(`hana_messages_${newSession.id}`, JSON.stringify(copiedMessages));
          } catch (e) {
            console.warn('Failed to save copied messages to localStorage:', e);
          }

          console.log(`Model switched from ${currentMode} to ${newMode} with conversation history copied`);
        } catch (error: any) {
          console.error('Failed to create new session for model change:', error);
          alert(error?.message || '새 세션 생성에 실패했습니다.');
          return;
        }
      } else {
        // 복사하지 않고 새 세션 시작
        const newAssistantId = defaultAssistantByMode[newMode];
        if (newAssistantId) {
          setCurrentMode(newMode);
          setAssistantId(newAssistantId);
          setSessionId(undefined);
          setMessages([]);
          hasExternalSession.current = false;
        }
      }
    } else {
      // 기존 대화가 없으면 단순히 모드만 변경
      setCurrentMode(newMode);
      const newAssistantId = defaultAssistantByMode[newMode];
      if (newAssistantId) {
        setAssistantId(newAssistantId);
      }
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
    <div className="flex flex-col h-screen">
      {/* Quality Dashboard removed by request */}

      {/* Fixed Chat Controls (filters removed; KB chooser added) */}
      <div className="flex-shrink-0 border-b bg-elevated/95 backdrop-blur-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3">
          <div className="flex items-center gap-2 min-w-0 overflow-x-auto scrollbar-none">
            {/* Mode Toggle */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Icon name="settings" size={14} className="text-muted-foreground" />
              <Select value={currentMode} onValueChange={handleModeChange}>
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
              {ephemeralAssistantId && assistantId === ephemeralAssistantId ? (
                <>
                  <Button variant="outline" size="sm" className="gap-1 h-8 text-xs px-2 border-orange-200 bg-orange-50 text-orange-700" disabled>
                    <Icon name="paperclip" size={14} />
                    <span className="hidden sm:inline">첨부파일 전용</span>
                    <Badge variant="secondary" className="ml-1 text-xs px-1 bg-orange-100 text-orange-800">파일</Badge>
                  </Button>
                  <Button variant="secondary" size="sm" className="h-8 text-xs px-2" onClick={applySelectedKnowledgeBases} disabled={kbApplying}>
                    {kbApplying ? '적용중' : '적용'}
                  </Button>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
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

        {/* Action Buttons - simplified for current session only */}
        <div className="px-3 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2 overflow-x-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs px-2 flex-shrink-0 text-muted-foreground"
              onClick={handleContextRollback}
              disabled={messages.length < 2}
            >
              <Icon name="arrow-left" size={14} />
              되돌리기
            </Button>
            {assistantId && sessionId && (
              <Button variant="destructive" size="sm" className="h-8 text-xs px-2 flex-shrink-0" onClick={handleDeleteSession}>
                <Icon name="trash-2" size={14} />
                세션 삭제
              </Button>
            )}
          </div>
        </div>

        {/* Knowledge Base Dialog */}
        <Dialog open={isKBOpen} onOpenChange={setIsKBOpen}>
          <DialogContent className="max-w-lg bg-white/80 dark:bg-slate-900/80 shadow-2xl border border-border/80">
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

      {/* Fixed Selected KB chips */}
      {selectedKBs.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 border-b bg-muted/20">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
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

      {/* Chat Messages - Scrollable Area */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-6 space-y-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent scroll-smooth">
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
                  onNavigateToKnowledgeBase={onNavigateToKnowledgeBase}
                  onSwitchToPrecise={handleSwitchToPrecise}
                />
                
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Fixed Search Input */}
      <div className="flex-shrink-0 p-4 border-t bg-elevated/95 backdrop-blur-lg">
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
