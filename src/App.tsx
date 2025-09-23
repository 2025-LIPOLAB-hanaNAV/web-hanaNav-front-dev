import React, { useEffect, useState } from 'react';
import { AppShell } from './components/AppShell';
import { ChatPage } from './components/ChatPage';
import { HomePage } from './components/HomePage';
// import { SavedDestinations } from './components/SavedDestinations';
import { ChatHistoryList } from './components/ChatHistoryList';
import { AdminConsole } from './components/AdminConsole';
import KnowledgeBase from './components/KnowledgeBase';
import { EvidencePanel } from './components/EvidencePanel';
import { ResizablePanel } from './components/ui/ResizablePanel';
import type { EvaluationResult } from './types/evaluation';

interface EvidenceItem {
  id: string;
  title: string;
  section: string;
  page?: number;
  confidence: number;
  type: 'official' | 'unofficial' | 'restricted';
  preview: string;
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
}

export default function App() {
  // 초기 진입을 홈 화면으로 설정
  const [currentView, setCurrentView] = useState('home');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [showEvidencePanel, setShowEvidencePanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchFiles, setSearchFiles] = useState<File[]>([]);
  const [initialSession, setInitialSession] = useState<{ assistantId: string; sessionId: string; messages?: { role: 'assistant' | 'user'; content: string }[] } | undefined>(undefined);
  const [librarySelectedSession, setLibrarySelectedSession] = useState<{ assistantId: string; sessionId: string; messages?: { role: 'assistant' | 'user'; content: string }[] } | null>(null);
  const [knowledgeBaseProps, setKnowledgeBaseProps] = useState<{
    initialDatasetId?: string;
    initialDocId?: string;
    initialChunkId?: string;
    initialHighlight?: string;
  }>({});
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResult[]>([]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  useEffect(() => {
    if (!librarySelectedSession && initialSession) {
      setLibrarySelectedSession(initialSession);
    }
  }, [initialSession, librarySelectedSession]);

  const handleSearch = (query: string, files?: File[]) => {
    // 홈에서 검색할 때는 새 세션 생성 (기존 세션 초기화)
    setInitialSession(undefined);
    setLibrarySelectedSession(null);
    setSearchQuery(query);
    setSearchFiles(files || []);
    setCurrentView('chat');
    console.log('Search from home:', query, files);
  };

  const handleQuestionClick = (question: string) => {
    // 홈에서 질문 클릭할 때도 새 세션 생성
    setInitialSession(undefined);
    setLibrarySelectedSession(null);
    setSearchQuery(question);
    setSearchFiles([]);
    setCurrentView('chat');
    console.log('Question clicked from home:', question);
  };

  const handlePresetClick = (preset: any) => {
    // 홈에서 프리셋 클릭할 때도 새 세션 생성
    setInitialSession(undefined);
    setLibrarySelectedSession(null);
    setSearchQuery(preset.title || preset.name || '');
    setSearchFiles([]);
    setCurrentView('chat');
    console.log('Preset clicked from home:', preset);
  };

  const handleEvidenceClick = (evidence: EvidenceItem) => {
    setSelectedEvidence(evidence);
    setShowEvidencePanel(true);
    console.log('Evidence clicked:', evidence);
  };

  const handleSourceClick = (source: SourceReference) => {
    console.log('Source clicked:', source);
    // Navigate to knowledge base without auto-filling search
    setKnowledgeBaseProps({
      initialDatasetId: source.datasetId,
      initialChunkId: source.chunkId,
      initialHighlight: '' // Don't auto-fill search with document content
    });
    setCurrentView('documents');
  };

  const handleNavigateToKnowledgeBase = (datasetId: string, docId?: string, chunkId?: string) => {
    console.log('Navigate to Knowledge Base:', { datasetId, docId, chunkId });
    // 벡터 DB 메뉴(Knowledge Base)로 이동하며 데이터셋 정보 표시
    setKnowledgeBaseProps({
      initialDatasetId: datasetId,
      initialDocId: docId,
      initialChunkId: chunkId,
      initialHighlight: ''
    });
    setCurrentView('documents');
  };

  const handleEvaluationResult = (result: EvaluationResult) => {
    console.log('Evaluation result received:', result);
    setEvaluationResults(prev => [result, ...prev.slice(0, 99)]); // 최대 100개까지만 저장
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return (
          <HomePage
            onSearch={handleSearch}
            onQuestionClick={handleQuestionClick}
            onPresetClick={handlePresetClick}
          />
        );
      case 'chat':
        return (
          <ChatPage
            key={initialSession ? `${initialSession.assistantId}:${initialSession.sessionId}` : 'chat-root'}
            onEvidenceClick={handleEvidenceClick}
            onSourceClick={handleSourceClick}
            onNavigateToKnowledgeBase={handleNavigateToKnowledgeBase}
            initialQuery={searchQuery}
            initialFiles={searchFiles}
            initialSession={initialSession}
            onQueryProcessed={() => {
              setSearchQuery('');
              setSearchFiles([]);
            }}
            onEvaluationResult={handleEvaluationResult}
          />
        );
      case 'library':
        return (
          <div className="h-full flex flex-col md:flex-row">
            {/* Mobile: stacked layout */}
            <div className="md:hidden border-b flex flex-col min-h-0">
              <ChatHistoryList
                activeSessionKey={librarySelectedSession ? `${librarySelectedSession.assistantId}:${librarySelectedSession.sessionId}` : undefined}
                onCreateNewSession={() => {
                  // 새 세션 생성은 ChatHistoryList에서 처리하므로 여기서는 빈 함수
                }}
                onOpenSession={(session) => {
                  const assistantId = (session as any).assistantId as string | undefined;
                  if (!assistantId) {
                    console.warn('No assistantId found for session:', session);
                    return;
                  }

                  const payload = {
                    assistantId,
                    sessionId: session.id,
                    messages: session.messages || []
                  };
                  console.log('Opening session from library:', payload);

                  // 기존 선택 해제 후 새 세션 설정
                  setLibrarySelectedSession(null);
                  setInitialSession(undefined);

                  // 비동기로 새 세션 설정
                  setTimeout(() => {
                    setLibrarySelectedSession(payload);
                    setInitialSession(payload);
                  }, 50);

                  const shouldSwitchToChat = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
                  if (shouldSwitchToChat) {
                    setCurrentView('chat');
                  }
                }}
              />
            </div>

            {/* Desktop: resizable panel layout */}
            <div className="hidden md:flex h-full flex-1">
              <ResizablePanel
                defaultWidth={320}
                minWidth={250}
                maxWidth={500}
                className="border-r flex flex-col min-h-0"
              >
                <ChatHistoryList
                  activeSessionKey={librarySelectedSession ? `${librarySelectedSession.assistantId}:${librarySelectedSession.sessionId}` : undefined}
                  onCreateNewSession={() => {
                    // 새 세션 생성은 ChatHistoryList에서 처리하므로 여기서는 빈 함수
                  }}
                  onOpenSession={(session) => {
                    const assistantId = (session as any).assistantId as string | undefined;
                    if (!assistantId) {
                      console.warn('No assistantId found for session:', session);
                      return;
                    }

                    const payload = {
                      assistantId,
                      sessionId: session.id,
                      messages: session.messages || []
                    };
                    console.log('Opening session from library:', payload);

                    // 기존 선택 해제 후 새 세션 설정
                    setLibrarySelectedSession(null);
                    setInitialSession(undefined);

                    // 비동기로 새 세션 설정
                    setTimeout(() => {
                      setLibrarySelectedSession(payload);
                      setInitialSession(payload);
                    }, 50);
                  }}
                />
              </ResizablePanel>

              <div className="flex-1 flex flex-col min-h-0">
                {librarySelectedSession ? (
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <ChatPage
                      key={`library-${librarySelectedSession.assistantId}-${librarySelectedSession.sessionId}-${Date.now()}`}
                      onEvidenceClick={handleEvidenceClick}
                      onSourceClick={handleSourceClick}
                      initialSession={librarySelectedSession}
                      onEvaluationResult={handleEvaluationResult}
                    />
                  </div>
                ) : (
                  <div className="m-auto px-8 text-center text-muted-foreground">
                    <h2 className="text-lg font-semibold mb-2">채팅 기록을 선택하세요</h2>
                    <p className="text-sm">
                      선택한 대화가 오른쪽에 로드되고, 바로 이어서 채팅을 진행할 수 있습니다.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'documents':
        return <KnowledgeBase {...knowledgeBaseProps} />;

      case 'laaj':
        return (
          <AdminConsole />
        );
      default:
        return (
          <HomePage
            onSearch={handleSearch}
            onQuestionClick={handleQuestionClick}
            onPresetClick={handlePresetClick}
          />
        );
    }
  };

  const renderRightPanelContent = () => {
    if (!showEvidencePanel || !selectedEvidence) return null;
    
    return (
      <EvidencePanel
        evidence={selectedEvidence}
        onClose={() => setShowEvidencePanel(false)}
      />
    );
  };

  return (
    <div className="min-h-screen text-foreground bg-background">
      <AppShell
        currentView={currentView}
        onViewChange={setCurrentView}
        isDark={isDarkMode}
        onThemeToggle={toggleTheme}
        showRightPanel={showEvidencePanel}
        rightPanelContent={renderRightPanelContent()}
      >
        {renderCurrentView()}
      </AppShell>
    </div>
  );
}
