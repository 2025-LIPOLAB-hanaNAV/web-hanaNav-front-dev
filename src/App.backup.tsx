import React, { useState } from 'react';
import { AppShell } from './components/AppShell';
import { ChatPage } from './components/ChatPage';
import { HomePage } from './components/HomePage';
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

interface SourceReference {
  id: string;
  title: string;
  content: string;
  datasetId: string;
  datasetName: string;
  chunkId?: string;
  similarity?: number;
}

export default function App() {
  // 초기 진입을 홈 화면으로 설정
  const [currentView, setCurrentView] = useState('home');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [showEvidencePanel, setShowEvidencePanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchFiles, setSearchFiles] = useState<File[]>([]);
  const [initialSession, setInitialSession] = useState<{ assistantId: string; sessionId: string } | undefined>(undefined);
  const [knowledgeBaseProps, setKnowledgeBaseProps] = useState<{
    initialDatasetId?: string;
    initialDocId?: string;
    initialChunkId?: string;
    initialHighlight?: string;
  }>({});

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

  const handleSourceClick = (source: SourceReference) => {
    console.log('Source clicked:', source);
    // Navigate to knowledge base with source highlighting
    setKnowledgeBaseProps({
      initialDatasetId: source.datasetId,
      initialChunkId: source.chunkId,
      initialHighlight: source.content.slice(0, 50) // Use first 50 chars as search term
    });
    setCurrentView('documents');
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
            onEvidenceClick={handleEvidenceClick}
            onSourceClick={handleSourceClick}
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
