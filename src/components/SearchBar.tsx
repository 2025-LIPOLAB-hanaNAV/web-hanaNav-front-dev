import React, { useState, useRef } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Icon } from './ui/Icon';
import { cn } from './ui/utils';
import { MagicSearchEffect } from './MagicSearchEffect';

interface SearchBarProps {
  onSearch: (query: string, files?: File[]) => void;
  onVoiceToggle?: (isActive: boolean) => void;
  placeholder?: string;
  isVoiceActive?: boolean;
  isLoading?: boolean;
  className?: string;
  variant?: 'default' | 'focused' | 'with-voice' | 'with-file';
  onMagicSearch?: (query: string, files?: File[]) => void;
}

interface AttachedFile {
  file: File;
  preview?: string;
}

export function SearchBar({ 
  onSearch, 
  onVoiceToggle,
  placeholder = "어디로 가시나요? (예: 육아휴직 급여 기준)",
  isVoiceActive = false,
  isLoading = false,
  className,
  variant = 'default',
  onMagicSearch
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isMagicActive, setIsMagicActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() || attachedFiles.length > 0) {
      // 마법 이펙트가 있는 경우 마법 검색 실행
      if (onMagicSearch) {
        setIsMagicActive(true);
        onMagicSearch(query, attachedFiles.map(af => af.file));
      } else {
        // 기본 검색
        onSearch(query, attachedFiles.map(af => af.file));
        setQuery('');
        setAttachedFiles([]);
      }
    }
  };

  const handleMagicComplete = () => {
    setIsMagicActive(false);
    onSearch(query, attachedFiles.map(af => af.file));
    setQuery('');
    setAttachedFiles([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
  };

  const addFiles = (files: File[]) => {
    const newAttachedFiles: AttachedFile[] = files.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));
    setAttachedFiles(prev => [...prev, ...newAttachedFiles]);
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => {
      const updated = [...prev];
      if (updated[index].preview) {
        URL.revokeObjectURL(updated[index].preview!);
      }
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return 'upload';
    return 'file-text';
  };

  return (
    <>
      <MagicSearchEffect 
        isActive={isMagicActive}
        onComplete={handleMagicComplete}
        query={query}
      />
      
      <div className={cn("w-full max-w-[1440px]", className)}>
        <form onSubmit={handleSubmit} className="space-y-3 w-full max-w-[1440px] mx-auto">
        <div 
          ref={dropZoneRef}
          className={cn(
            "relative rounded-2xl border-2 transition-all duration-200",
            isDragOver 
              ? "border-primary bg-primary/5" 
              : variant === 'focused'
              ? "border-primary shadow-md"
              : "border-border bg-elevated",
            "focus-within:border-primary focus-within:shadow-md"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragOver && (
            <div className="absolute inset-0 bg-primary/10 rounded-2xl flex items-center justify-center z-10">
              <div className="text-center">
                <Icon name="upload" size={32} className="text-primary mx-auto mb-2" />
                <p className="text-primary font-medium">파일을 여기에 놓으세요</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-around bg-[rgba(0,0,0,0)] rounded-[0px] w-full max-w-7xl min-w-[800px] m-[0px] px-4 py-0">
            <Icon name="search" size={24} className="text-muted-foreground flex-shrink-0" />
            
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className={cn(
                "border-0 bg-transparent text-xl px-0 shadow-none focus-visible:ring-0 font-light placeholder:text-muted-foreground/60 placeholder:font-light py-2 transition-all duration-300",
                isMagicActive && "text-primary glow-text"
              )}
              disabled={isLoading || isMagicActive}
            />
            
            <div className="flex items-center gap-3 flex-shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-muted-foreground hover:text-foreground p-3"
              >
                <Icon name="file-text" size={20} />
              </Button>
              

              
              <Button
                type="submit"
                size="sm"
                disabled={(!query.trim() && attachedFiles.length === 0) || isLoading || isMagicActive}
                className={cn(
                  "button-primary text-white font-medium px-6 py-2 border-0 ml-2 transition-all duration-300 text-sm",
                  isMagicActive && "animate-pulse shadow-lg shadow-primary/50"
                )}
              >
                {isMagicActive ? '🔮 마법 시전 중...' : isLoading ? '검색 중...' : '검색'}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Attached Files */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachedFiles.map((attachedFile, index) => {
              const iconName = getFileIcon(attachedFile.file);
              return (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-2 px-3 py-2 text-sm"
                >
                  <Icon name={iconName as any} size={16} />
                  <span className="truncate max-w-24">
                    {attachedFile.file.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive/20"
                    onClick={() => removeFile(index)}
                  >
                    <Icon name="help-circle" size={12} />
                  </Button>
                </Badge>
              );
            })}
          </div>
        )}
      </form>
      
      {/* Voice Active Indicator */}
      {isVoiceActive && (
        <div className="flex items-center justify-center mt-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm text-primary font-medium">음성 입력 중...</span>
          </div>
        </div>
      )}
      </div>
    </>
  );
}