import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';

export function EvaluationPanelSimple() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">LLM 품질 평가 (Simple)</h2>
          <p className="text-muted-foreground">Ollama 모델을 사용한 자동 품질 평가</p>
        </div>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">테스트 화면</h3>
        <p>품질평가 패널이 정상적으로 로딩됩니다.</p>
        <Button className="mt-4">테스트 버튼</Button>
      </Card>
    </div>
  );
}