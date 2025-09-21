import React, { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Icon } from './ui/Icon';
import { MenuIcon, ChevronLeftIcon } from './icons';
import { cn } from './ui/utils';
import { HanaNaviLogo } from './ui/HanaNaviLogo';

interface AppShellProps {
  children: React.ReactNode;
  currentView: string;
  onViewChange: (view: string) => void;
  isDark: boolean;
  onThemeToggle: () => void;
  showRightPanel?: boolean;
  rightPanelContent?: React.ReactNode;
  notificationCount?: number;
}

export function AppShell({ 
  children, 
  currentView, 
  onViewChange, 
  isDark, 
  onThemeToggle,
  showRightPanel = false,
  rightPanelContent,
  notificationCount = 0
}: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Sidebar navigation items
  // 요구사항: 홈 / 라이브러리 / 지식베이스 / LaaJ
  // - 홈: 첫 채팅 화면으로 이동 (기존 'chat' 뷰 사용)
  // - 라이브러리: 채팅 기록 리스트(임시로 기존 SavedDestinations 화면 매핑)
  // - 지식베이스: 문서/벡터 DB 관리 (기존 'documents')
  // - LaaJ: LLM 평가 화면 (임시로 운영자 콘솔 매핑)
  const navigationItems = [
    { id: 'home', label: '집으로', icon: 'home' },
    { id: 'library', label: '라이브러리', icon: 'book-open' },
    { id: 'documents', label: '지식베이스', icon: 'file-text' },
    { id: 'laaj', label: '운영콘솔', icon: 'settings' },
  ];

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header - Enhanced */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-elevated/95 backdrop-blur-lg shadow-lg">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="md:hidden"
          >
            <Icon name="search" size={20} />
          </Button>
          <div
            className="flex items-center gap-4 cursor-pointer transition-all duration-200 hover:scale-105"
            onClick={() => onViewChange('home')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onViewChange('home');
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="홈으로 이동"
            title="홈으로 이동"
          >
            <HanaNaviLogo size={48} className="transition-transform hover:scale-105" />
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-display">하나 Navi</h1>
              <p className="text-sm text-muted-foreground hidden md:block font-normal tracking-wide font-body">정보 탐색 경로 안내</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onThemeToggle}
          >
            {isDark ? <Icon name="star" size={16} /> : <Icon name="star" size={16} />}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation */}
        <nav className={cn(
          "border-r bg-elevated transition-all duration-300",
          isSidebarCollapsed ? "w-16" : "w-52",
          "hidden md:flex md:flex-col"
        )}>
          {/* Collapse/Expand Button */}
          <div className="p-2 border-b">
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="nav-toggle group inline-flex h-9 w-full items-center justify-center rounded-lg bg-white/30 backdrop-blur-md shadow-sm ring-1 ring-black/5 text-neutral-700 dark:text-neutral-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 hover:scale-105 active:scale-95 transition-all duration-180 ease-out cursor-pointer"
              aria-label={isSidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
              aria-expanded={!isSidebarCollapsed}
            >
              <div className="transition-transform duration-180 ease-out group-hover:rotate-12">
                {isSidebarCollapsed ? (
                  <MenuIcon size={16} className="text-current" />
                ) : (
                  <ChevronLeftIcon size={16} className="text-current" />
                )}
              </div>
            </button>
          </div>
          <div className="p-4 space-y-2">
            {navigationItems.map((item) => {
              return (
                <Button
                  key={item.id}
                  variant={currentView === item.id ? "default" : "ghost"}
                  className={cn(
                    "w-full transition-all duration-300 ease-out cursor-pointer",
                    "hover:scale-105 hover:shadow-lg active:scale-95",
                    "relative overflow-hidden group",
                    currentView === item.id && "shadow-md shadow-primary/20",
                    isSidebarCollapsed ? "justify-center px-2" : "justify-start"
                  )}
                  onClick={(e) => {
                    // 클릭 리플 효과
                    const button = e.currentTarget;
                    const ripple = document.createElement('div');
                    const rect = button.getBoundingClientRect();
                    const size = Math.max(rect.width, rect.height);
                    const x = e.clientX - rect.left - size / 2;
                    const y = e.clientY - rect.top - size / 2;
                    
                    ripple.style.cssText = `
                      position: absolute;
                      border-radius: 50%;
                      background: rgba(139, 92, 246, 0.3);
                      width: ${size}px;
                      height: ${size}px;
                      left: ${x}px;
                      top: ${y}px;
                      animation: ripple 0.6s ease-out;
                      pointer-events: none;
                      z-index: 0;
                    `;
                    
                    button.appendChild(ripple);
                    setTimeout(() => ripple.remove(), 600);
                    
                    // 글로우 효과
                    button.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.6)';
                    setTimeout(() => {
                      button.style.boxShadow = '';
                    }, 200);
                    
                    onViewChange(item.id);
                  }}
                >
                  <Icon 
                    name={item.icon as any} 
                    size={16} 
                    className={cn(
                      "relative z-10 transition-all duration-300",
                      currentView === item.id && "text-primary-foreground"
                    )} 
                  />
                  {!isSidebarCollapsed && (
                    <span className={cn(
                      "ml-3 font-medium text-sm relative z-10 transition-all duration-300",
                      currentView === item.id && "text-primary-foreground"
                    )}>
                      {item.label}
                    </span>
                  )}
                  {/* 백그라운드 글로우 효과 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
                </Button>
              );
            })}
          </div>
        </nav>

        {/* Mobile Navigation */}
        {!isSidebarCollapsed && (
          <div className="fixed inset-0 z-50 md:hidden bg-background/80 backdrop-blur-sm">
            <nav className="w-64 h-full bg-elevated border-r">
              <div className="p-4 space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="w-full justify-start mb-4"
                >
                  <Icon name="search" size={16} className="mr-2" />
                  메뉴 닫기
                </Button>
                {navigationItems.map((item) => {
                  return (
                    <Button
                      key={item.id}
                      variant={currentView === item.id ? "default" : "ghost"}
                      className="w-full justify-start cursor-pointer"
                      onClick={() => {
                        onViewChange(item.id);
                        setIsSidebarCollapsed(true);
                      }}
                    >
                      <Icon name={item.icon as any} size={16} className="mr-2" />
                      {item.label}
                    </Button>
                  );
                })}
              </div>
            </nav>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          <main className={cn(
            "flex-1 overflow-hidden",
            showRightPanel && "mr-80 hidden lg:block"
          )}>
            {children}
          </main>

          {/* Right Panel */}
          {showRightPanel && (
            <aside className="w-80 border-l bg-elevated overflow-hidden hidden lg:block">
              {rightPanelContent}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
