# RAG 챗봇 앱 - 폐쇄망 환경 수동 수정 가이드

## 📋 **수정 목적**
- Ollama 모델 동적 로딩 오류 해결
- 포트 불일치 문제 수정
- 안티 환각 시스템 조정
- 하드코딩된 모델 목록 실제 모델로 교체

---

## 🔧 **수정 1: Ollama 포트 수정**

### **파일:** `src/services/ollama.ts`
### **위치:** 약 159번 줄
### **문제:** 포트 11434로 하드코딩됨

```typescript
// 🔍 찾을 코드 (기존)
return 'http://localhost:11434';

// ✅ 수정할 코드 (새로운)
return 'http://localhost:11435';
```

**또는 더 안전한 방법:**
```typescript
// 🔍 찾을 코드 (기존)
if (hostname === 'localhost' || hostname === '127.0.0.1') {
  console.log('🔧 Using localhost URL');
  return 'http://localhost:11434';
}

// ✅ 수정할 코드 (새로운)
if (hostname === 'localhost' || hostname === '127.0.0.1') {
  console.log('🔧 Using localhost URL');
  return 'http://localhost:11435';
}
```

---

## 🔧 **수정 2: 하드코딩된 모델 목록 교체**

### **파일:** 품질 평가 관련 컴포넌트 (정확한 파일명 확인 필요)
### **찾을 패턴:** `Gemma 3 12B`, `Mistral 7B` 등

```typescript
// 🔍 찾을 코드 (기존 - 하드코딩)
const availableModels = [
  'Gemma 3 12B',
  'Gemma 3 8B',
  'Mistral 7B'
];

// ✅ 수정할 코드 (새로운 - 실제 모델)
const availableModels = [
  'gemma3:27b',      // 17GB - 최고 성능
  'gemma3:12b',      // 8.1GB - 기본 권장
  'gpt-oss:latest'   // 13GB - 실험적
];
```

### **모델 표시명 개선 (선택사항)**
```typescript
// 모델 표시명 함수 추가
const getModelDisplayName = (modelName: string) => {
  const modelInfo: Record<string, string> = {
    'gemma3:27b': 'Gemma 3 27B (17GB, 최고 품질)',
    'gemma3:12b': 'Gemma 3 12B (8.1GB, 기본 권장)',
    'gpt-oss:latest': 'GPT-OSS (13GB, 실험적)'
  };

  return modelInfo[modelName] || modelName;
};
```

---

## 🔧 **수정 3: 리랭커/임베딩 모델 필터링**

### **파일:** `src/services/ollama.ts` 또는 모델 로딩 부분
### **목적:** LLM만 표시하고 리랭커/임베딩 모델 제외

```typescript
// 🔍 찾을 코드 (기존)
const llmModels = data.models.map((model: any) => model.name);

// ✅ 수정할 코드 (새로운)
const llmModels = data.models
  .filter((model: any) => {
    const name = model.name.toLowerCase();
    return !name.includes('reranker') &&
           !name.includes('embed') &&
           !name.includes('bge-') &&
           !name.includes('arctic-embed');
  })
  .map((model: any) => model.name);
```

---

## 🔧 **수정 4: 안티 환각 프롬프트 조정**

### **파일:** `src/components/ChatPage.tsx`
### **위치:** 약 850-900번 줄 근처 (안티 환각 프롬프트 부분)

```typescript
// 🔍 찾을 코드 (기존 - 너무 엄격)
- 검색 결과에 직접적인 관련 정보가 **2개 이상** 있을 때만 답변하세요.

// ✅ 수정할 코드 (새로운 - 완화)
- 검색 결과 중 **50% 이상 유사도**를 가진 관련 정보가 있을 때 답변하세요.
```

### **전체 프롬프트 교체 (더 효과적)**
```typescript
// 🔍 찾을 코드 (기존)
const antiHallucinationPrompt = `당신은 정확한 정보만 제공하는 AI입니다.

제공된 지식베이스 검색 결과를 바탕으로만 답변하세요.
- 검색 결과에 직접적인 관련 정보가 **2개 이상** 있을 때만 답변하세요.
- 불확실하거나 추측성 정보는 절대 포함하지 마세요.
- 지식베이스에 없는 내용은 "제공된 지식베이스에서는 해당 정보를 찾을 수 없습니다"라고 답변하세요.

현재 검색된 근거: ${evidenceCount}개`;

// ✅ 수정할 코드 (새로운)
const antiHallucinationPrompt = `당신은 지식베이스 기반 정보 제공 AI입니다.

검색된 지식베이스 내용을 바탕으로 답변하세요:
- 검색 결과에서 **관련성이 높은 정보(50% 이상 유사도)**가 발견되면 해당 내용을 활용하여 답변하세요.
- 여러 검색 결과가 일치하는 내용이면 더욱 신뢰할 수 있습니다.
- 지식베이스에 전혀 관련 없는 내용만 있을 때만 "해당 정보를 찾을 수 없습니다"라고 답변하세요.
- 출처를 명확히 표시하고, 불확실한 부분은 "지식베이스 내용에 따르면..."으로 시작하세요.

현재 검색된 근거: ${evidenceCount}개
유사도가 높은 근거들을 우선적으로 활용하세요.`;
```

---

## 🔧 **수정 5: 유사도 임계값 조정**

### **파일:** `src/components/ChatPage.tsx`
### **위치:** 약 965번 줄 근처

```typescript
// 🔍 찾을 코드 (기존 - 너무 엄격)
similarity_threshold: 0.2,

// ✅ 수정할 코드 (새로운 - 완화)
similarity_threshold: 0.1,
```

---

## 🔧 **수정 6: Temperature 조정 (환각 방지)**

### **파일:** `src/components/ChatPage.tsx`
### **위치:** RAGFlow API 호출 부분

```typescript
// 🔍 찾을 코드 (기존)
temperature: 0.3,

// ✅ 수정할 코드 (새로운 - 더 보수적)
temperature: 0.1,  // 또는 0.05
```

---

## 🔧 **수정 7: 환경변수 설정**

### **파일:** `.env.local`
### **현재 실제 모델에 맞게 설정**

```bash
# Ollama 설정
VITE_OLLAMA_URL=http://localhost:11435
VITE_OLLAMA_MODEL=gemma3:12b
VITE_JUDGE_MODEL=gemma3:27b
VITE_RAG_MODEL=gemma3:12b

# 리랭커 설정 (RAGFlow)
VITE_RAGFLOW_ENABLE_RERANK=true
VITE_RAGFLOW_RERANK_MODEL=BAAI/bge-reranker-v2-m3

# 평가 시스템
VITE_ENABLE_RAG_EVALUATION=true
```

---

## 🔧 **수정 8: 강력한 환각 방지 (선택사항)**

### **파일:** `src/services/ragflow.ts` 또는 ChatPage.tsx
### **숫자/금액 환각 방지**

```typescript
// 시스템 메시지에 추가
const systemMessage = `You are a strict fact-checker that ONLY uses information explicitly stated in the provided documents.

CRITICAL RULES:
- NO speculation about amounts, numbers, or details not in documents
- NO general knowledge supplements
- NO reasonable assumptions
- If specific figures aren't mentioned, say "구체적인 수치는 문서에 명시되어 있지 않습니다"
- Quote ONLY what is directly written in the source material

Respond in Korean and cite sources for every claim.`;
```

---

## 📝 **수정 순서 권장사항**

1. **우선순위 1**: 수정 1 (포트 수정) - 즉시 Ollama 연결 해결
2. **우선순위 2**: 수정 2 (모델 목록) - 실제 모델 표시
3. **우선순위 3**: 수정 4 (안티 환각) - 응답 품질 개선
4. **우선순위 4**: 수정 5,6 (임계값, Temperature) - 세밀 조정
5. **선택사항**: 수정 3,7,8 - 추가 개선

---

## 🔍 **파일 찾는 방법**

```bash
# 특정 텍스트가 있는 파일 찾기
grep -r "Gemma 3 12B" src/
grep -r "11434" src/
grep -r "similarity_threshold" src/
grep -r "antiHallucinationPrompt" src/
```

---

## ✅ **수정 완료 후 확인사항**

1. **새로고침** 후 브라우저 콘솔에서:
   ```
   ✅ 🔍 Fetching models from: http://localhost:11435
   ✅ Available models: ['gemma3:27b', 'gemma3:12b', 'gpt-oss:latest']
   ```

2. **몽골 G은행 질문** 테스트:
   - "몽골 최대은행 채권 사기 관련 내용 알아?"
   - 근거가 있는데도 "정보 없음" 응답하지 않는지 확인

3. **평가 시스템** 작동:
   - "Failed to fetch" 에러 없이 점수 표시되는지 확인

---

*폐쇄망 환경에서 이 가이드를 참고하여 수정하시면 모든 기능이 정상 작동할 것입니다.*