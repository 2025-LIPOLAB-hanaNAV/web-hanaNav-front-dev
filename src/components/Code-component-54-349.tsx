import React, { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Icon } from './ui/Icon';
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
}

export function AppShell({ 
  children, 
  currentView, 
  onViewChange, 
  isDark, 
  onThemeToggle,
  showRightPanel = false,
  rightPanelContent 
}: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const navigationItems = [
    { id: 'home', label: '집으로', icon: 'home' },
    { id: 'chat', label: '채팅', icon: 'search' },
    { id: 'saved', label: '저장된 방문지', icon: 'bookmark' },
    { id: 'documents', label: '문서', icon: 'file-text' },
    { id: 'admin', label: '운영자 콘솔', icon: 'settings' },
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
            title="집으로"
          >
            <HanaNaviLogo size={48} className="transition-transform hover:scale-105" />
            <div>
              <h1 className="text-2xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-[rgba(0,0,0,0)] font-[Jua]">하나 Navi</h1>
              <p className="text-sm text-muted-foreground hidden md:block font-semibold tracking-wide font-[Jua]">정보 탐색 경로 안내</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="relative">
            <Icon name="info" size={16} />
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs"
            >
              3
            </Badge>
          </Button>
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
          <div className="p-4 space-y-2">
            {navigationItems.map((item) => {
              return (
                <Button
                  key={item.id}
                  variant={currentView === item.id ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start transition-all duration-300 ease-out",
                    "hover:scale-105 hover:shadow-lg active:scale-95",
                    "relative overflow-hidden group",
                    currentView === item.id && "shadow-md shadow-primary/20",
                    isSidebarCollapsed && "px-2"
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
                      "ml-3 font-semibold font-normal text-[15px] font-[DynaPuff] font-bold relative z-10 transition-all duration-300",
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
                      className="w-full justify-start"
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
            "flex-1 overflow-auto",
            showRightPanel && "mr-80 hidden lg:block"
          )}>
            {children}
          </main>
          
          {/* Right Panel */}
          {showRightPanel && (
            <aside className="w-80 border-l bg-elevated overflow-auto hidden lg:block">
              {rightPanelContent}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}