import React, { useState } from 'react';
import { AppShell } from './components/AppShell';
import { ChatPage } from './components/ChatPage';
// import { SavedDestinations } from './components/SavedDestinations';
import { ChatHistoryList } from './components/ChatHistoryList';
import { AdminConsole } from './components/AdminConsole';
import { KnowledgeBase } from './components/KnowledgeBase';
import { EvidencePanel } from './components/EvidencePanel';

interface EvidenceItem {
  id: string;
  title: string;
  section: string;
  page?: number;
  confidence: number;
  type: 'official' | 'unofficial' | 'restricted';
  preview: string;
}

export default function App() {
  // 초기 진입을 채팅 화면으로 설정
  const [currentView, setCurrentView] = useState('chat');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [showEvidencePanel, setShowEvidencePanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchFiles, setSearchFiles] = useState<File[]>([]);
  const [initialSession, setInitialSession] = useState<{ assistantId: string; sessionId: string } | undefined>(undefined);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleSearch = (query: string, files?: File[]) => {
    setSearchQuery(query);
    setSearchFiles(files || []);
    setCurrentView('chat');
    console.log('Search:', query, files);
  };

  const handleQuestionClick = (question: string) => {
    setSearchQuery(question);
    setSearchFiles([]);
    setCurrentView('chat');
    console.log('Question clicked:', question);
  };

  const handlePresetClick = (preset: any) => {
    setSearchQuery(preset.title || preset.name || '');
    setSearchFiles([]);
    setCurrentView('chat');
    console.log('Preset clicked:', preset);
  };

  const handleEvidenceClick = (evidence: EvidenceItem) => {
    setSelectedEvidence(evidence);
    setShowEvidencePanel(true);
    console.log('Evidence clicked:', evidence);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'chat':
        return (
          <ChatPage
            onEvidenceClick={handleEvidenceClick}
            initialQuery={searchQuery}
            initialFiles={searchFiles}
            initialSession={initialSession}
            onQueryProcessed={() => {
              setSearchQuery('');
              setSearchFiles([]);
            }}
          />
        );
      case 'library':
        return (
          <ChatHistoryList
            onOpenSession={(session) => {
              // session carries assistantId optionally
              if ((session as any).assistantId) {
                setInitialSession({ assistantId: (session as any).assistantId, sessionId: session.id });
              }
              setCurrentView('chat');
            }}
          />
        );
      case 'documents':
        return <KnowledgeBase />;
      case 'laaj':
        return (
          <AdminConsole />
        );
      default:
        // 호환성을 위해 남겨둔 홈(랜딩) 화면
        // 필요 시 'home' 케이스에서 기존 HomePage를 렌더링할 수 있습니다.
        return null;
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
    <div className="min-h-screen text-foreground" style={{ background: 'var(--background)' }}>
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
