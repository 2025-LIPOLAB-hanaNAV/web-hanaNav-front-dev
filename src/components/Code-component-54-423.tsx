import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { SearchBar } from './SearchBar';
import { Icon } from './ui/Icon';
import { cn } from './ui/utils';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { HanaNaviLogo } from './ui/HanaNaviLogo';

interface PopularQuestion {
  id: string;
  question: string;
  category: string;
  count: number;
}

interface DepartmentShortcut {
  id: string;
  name: string;
  icon: string;
  color: string;
  questions: string[];
}

interface PresetRoute {
  id: string;
  title: string;
  description: string;
  steps: number;
  category: string;
  icon: string;
}

interface HomePageProps {
  onSearch: (query: string, files?: File[]) => void;
  onQuestionClick: (question: string) => void;
  onPresetClick: (preset: PresetRoute) => void;
}

export function HomePage({ onSearch, onQuestionClick, onPresetClick }: HomePageProps) {
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  const popularQuestions: PopularQuestion[] = [
    { id: '1', question: '고객 민원 처리 절차와 기준은?', category: '소비자보호', count: 234 },
    { id: '2', question: '정기예금 중도해지 시 이자계산법', category: '수신', count: 189 },
    { id: '3', question: '주택담보대출 금리 우대조건', category: '여신', count: 156 },
    { id: '4', question: '개인연금 세액공제 한도 안내', category: '연금', count: 143 },
    { id: '5', question: '소비자분쟁조정위원회 신청방법', category: '소비자보호', count: 98 },
    { id: '6', question: '보이스피싱 내점 고객 처리방법', category: '소비자보호', count: 167 },
  ];

  const departmentShortcuts: DepartmentShortcut[] = [
    {
      id: 'consumer',
      name: '소비자보호',
      icon: 'shield-check',
      color: 'bg-emerald-500',
      questions: ['민원처리', '분쟁조정', '약관설명', '피해보상']
    },
    {
      id: 'deposit',
      name: '수신',
      icon: 'piggy-bank',
      color: 'bg-blue-500',
      questions: ['예금상품', '적금가입', '이자계산', '만기처리']
    },
    {
      id: 'credit',
      name: '여신',
      icon: 'credit-card',
      color: 'bg-orange-500',
      questions: ['대출신청', '한도조회', '금리안내', '상환계획']
    },
    {
      id: 'pension',
      name: '연금',
      icon: 'coins',
      color: 'bg-purple-500',
      questions: ['연금상품', '수령방법', '세제혜택', '가입조건']
    }
  ];

  const presetRoutes: PresetRoute[] = [
    {
      id: 'consumer-protection',
      title: '소비자보호 가이드',
      description: '민원접수부터 해결까지 완벽 프로세스',
      steps: 8,
      category: '소비자보호',
      icon: '🛡️'
    },
    {
      id: 'deposit-products',
      title: '수신상품 안내',
      description: '예적금 상품 특징 및 가입절차',
      steps: 5,
      category: '수신',
      icon: '🏦'
    },
    {
      id: 'loan-process',
      title: '여신업무 프로세스',
      description: '대출신청부터 실행까지 전체 흐름',
      steps: 6,
      category: '여신',
      icon: '💳'
    },
    {
      id: 'pension-guide',
      title: '연금상품 완전정복',
      description: '개인연금부터 퇴직연금까지 총정리',
      steps: 7,
      category: '연금',
      icon: '💰'
    }
  ];

  return (
    <div className="min-h-full bg-background">
      {/* Hero Section - Figma Inspired */}
      <div className="relative overflow-hidden min-h-[500px] flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5" />
        <div className="relative px-6 py-16 lg:py-24">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <div className="space-y-6">
              <div className="flex flex-col items-center space-y-6">
                <HanaNaviLogo 
                  size={120} 
                  className="animate-pulse opacity-90 hover:opacity-100 transition-opacity duration-1000" 
                />
                <h1 className="text-display font-extrabold text-foreground leading-tight">
                  어디로 떠나시겠어요?
                </h1>
              </div>
              <p className="text-subtitle max-w-3xl mx-auto">
                당신의 여정에 함께할게요.
              </p>
            </div>
            
            <div className="mt-12">
              <SearchBar
                onSearch={onSearch}
                onMagicSearch={(query, files) => {
                  // 마법 이펙트 완료 후 실제 검색 실행됨
                }}
                placeholder="어디로 떠나시겠어요? (예: 주택담보대출 금리 조건)"
                className="max-w-[1440px] mx-auto"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-12 space-y-12">
        {/* Popular Questions */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <Icon name="arrow-right" size={24} className="text-primary" />
            <h2 className="text-2xl font-bold">인기 방문지</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularQuestions.map((question) => (
              <Card 
                key={question.id}
                className="card-enhanced p-6 hover:shadow-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] h-full bg-[rgba(255,255,255,0.7)]"
                onClick={() => onQuestionClick(question.question)}
              >
                <div className="flex flex-col h-full gap-4">
                  <div className="flex-1">
                    <p className="text-base font-semibold text-foreground mb-4 leading-relaxed">{question.question}</p>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                      <Badge variant="outline" className="text-sm font-medium px-3 py-1 shrink-0">
                        {question.category}
                      </Badge>
                      <span className="text-sm text-muted-foreground font-medium">
                        {question.count}회 검색
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Icon name="arrow-right" size={20} className="text-muted-foreground" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Preset Routes */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <Icon name="arrow-right" size={24} className="text-primary" />
            <h2 className="text-2xl font-bold">상황별 프리셋 경로</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {presetRoutes.map((route) => (
              <Card 
                key={route.id}
                className="card-enhanced p-8 hover:shadow-xl cursor-pointer transition-all duration-300 group hover:scale-[1.02] bg-[rgba(255,255,255,0.7)]"
                onClick={() => onPresetClick(route)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-4xl">{route.icon}</span>
                      <div>
                        <h3 className="text-xl font-bold group-hover:text-primary transition-colors mb-2">
                          {route.title}
                        </h3>
                        <Badge variant="outline" className="text-sm font-semibold px-3 py-1">
                          {route.category}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-base text-muted-foreground mb-4 leading-relaxed">
                      {route.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
                      <div className="flex items-center gap-2">
                        <Icon name="pin" size={16} />
                        {route.steps}단계
                      </div>
                    </div>
                  </div>
                  
                  <Icon name="arrow-right" size={20} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Department Shortcuts */}
        <section className="bg-[rgba(0,0,0,0)]">
          <div className="flex items-center gap-4 mb-8">
            <Icon name="settings" size={24} className="text-primary" />
            <h2 className="text-2xl font-bold">부서별 자주 찾는 항목</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {departmentShortcuts.map((dept) => {
              return (
                <Card
                  key={dept.id}
                  className={cn(
                    "card-enhanced cursor-pointer transition-all duration-500 hover:scale-110 group overflow-hidden relative",
                    selectedDepartment === dept.id 
                      ? "ring-2 ring-primary shadow-2xl shadow-primary/20 bg-gradient-to-br from-primary/20 to-accent/10" 
                      : "hover:shadow-2xl hover:shadow-primary/10"
                  )}
                  onClick={() => setSelectedDepartment(
                    selectedDepartment === dept.id ? null : dept.id
                  )}
                >
                  <div className="relative h-full min-h-[140px] flex flex-col items-center justify-center text-center gap-4 p-6">
                    {/* Background decoration */}
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {/* Main icon container with enhanced design */}
                    <div className="relative">
                      <div className={cn(
                        "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-2xl transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
                        dept.color,
                        "relative overflow-hidden"
                      )}>
                        {/* Shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <Icon name={dept.icon as any} size={28} className="text-white relative z-10 drop-shadow-lg" />
                      </div>
                      
                      {/* Floating particles effect */}
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary/60 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-all duration-500" />
                      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-accent/60 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-all duration-700" />
                    </div>
                    
                    {/* Department name with enhanced typography */}
                    <div className="flex flex-col items-center gap-2">
                      <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                        {dept.name}
                      </h3>
                      <div className="w-12 h-1 bg-gradient-to-r from-primary to-accent rounded-full mx-auto transform scale-0 group-hover:scale-100 transition-transform duration-500" />
                    </div>
                    
                    {/* Bottom accent */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                  </div>
                </Card>
              );
            })}
          </div>
          
          {selectedDepartment && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {departmentShortcuts
                .find(d => d.id === selectedDepartment)
                ?.questions.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="button-primary text-white font-semibold py-3 px-4 border-0"
                  onClick={() => onQuestionClick(question)}
                >
                  {question}
                </Button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}