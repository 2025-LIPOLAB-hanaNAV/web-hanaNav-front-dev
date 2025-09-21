# 🎯 데모 시나리오 및 사용 가이드

## 📱 시연 시나리오

### 🔄 시나리오 1: 기본 채팅 워크플로우
```bash
1. 홈페이지 접속 → "새 대화 시작"
2. 어시스턴트 선택: "빠른 응답"
3. 질문: "안녕하세요!"
4. 응답 확인 후 추가 질문
5. 채팅 히스토리에서 세션 관리
```

### 📚 시나리오 2: 지식베이스 활용 워크플로우
```bash
1. 새 대화 시작 → "정밀 검증" 모드 선택
2. 지식베이스 버튼 클릭 → 원하는 KB 선택
3. "적용" 버튼으로 지식베이스 연결
4. 전문 질문: "대출 승인 절차는 어떻게 되나요?"
5. 근거 자료와 함께 답변 확인
6. 출처 링크 클릭하여 상세 내용 확인
```

### 📁 시나리오 3: 파일 업로드 채팅
```bash
1. 새 대화 시작
2. 파일 드래그 앤 드롭 (PDF, DOCX, TXT 등)
3. "첨부파일 전용" 모드 자동 활성화 확인
4. 파일 내용 관련 질문: "이 계약서의 핵심 조건은?"
5. 업로드된 파일만을 기반으로 한 답변 확인
```

### 📊 시나리오 4: 평가 시스템 활용
```bash
1. 관리자 콘솔 접속 → "품질 평가" 탭
2. 평가 데이터셋 업로드 (JSON 형식)
3. 평가 지표 선택 (정확도, 관련성, 가독성, 개인정보)
4. 모델 선택 (gemma3:12b 등)
5. 배치 평가 실행 및 결과 분석
6. 결과 다운로드 (CSV/JSON)
```

## 🎮 사용자 인터페이스 가이드

### 메인 채팅 화면
```
┌─────────────────────────────────────────┐
│ 🏠 홈  📝 채팅  📚 지식베이스  ⚙️ 관리    │
├─────────────────────────────────────────┤
│ [어시스턴트: 빠른응답 ▼] [지식베이스 📖]  │
│                         [적용]         │
├─────────────────────────────────────────┤
│                                         │
│  💬 채팅 메시지 영역                      │
│                                         │
│  🤖 AI: 안녕하세요! 무엇을 도와드릴까요?    │
│      [🔗 출처] [⭐ 근거 3개] [⏱️ 1.2초]    │
│                                         │
├─────────────────────────────────────────┤
│ 📎 │ 메시지를 입력하세요...        │ 📤  │
└─────────────────────────────────────────┘
```

### 지식베이스 선택 모달
```
┌─────────────────────────────────────────┐
│          📚 지식베이스 선택               │
├─────────────────────────────────────────┤
│ 🔍 [검색창]                             │
├─────────────────────────────────────────┤
│ ☑️ 은행업무 규정집                       │
│ ☑️ 대출 상품 가이드                      │
│ ☐ 투자 상품 매뉴얼                       │
│ ☐ 고객상담 FAQ                          │
├─────────────────────────────────────────┤
│           [취소]    [선택완료]            │
└─────────────────────────────────────────┘
```

## 🔧 개발자를 위한 API 예시

### 채팅 세션 생성
```typescript
import { createSession } from './services/ragflow';

const newSession = await createSession({
  name: "고객상담 세션",
  assistantId: "precise-verification",
  datasetIds: ["kb-001", "kb-002"]
});

console.log('세션 ID:', newSession.id);
```

### 스트리밍 메시지 전송
```typescript
import { sendMessage } from './services/ragflow';

const response = await sendMessage(sessionId, {
  message: "대출 한도 계산 방법을 알려주세요",
  stream: true,
  onData: (chunk) => {
    console.log('수신:', chunk);
    // UI 업데이트
  }
});
```

### 파일 업로드 및 벡터화
```typescript
import { uploadFiles, createEphemeralDataset } from './services/ragflow';

// 1. 임시 데이터셋 생성
const dataset = await createEphemeralDataset("uploaded-files");

// 2. 파일 업로드
const uploadedFiles = await uploadFiles(dataset.id, fileList);

// 3. 문서 파싱 및 벡터화
await parseDocuments(dataset.id, uploadedFiles.map(f => f.id));

// 4. 파일 기반 채팅 시작
const session = await createSession({
  name: "파일 기반 채팅",
  datasetIds: [dataset.id]
});
```

### 평가 시스템 통합
```typescript
import { evaluateWithOllama, batchEvaluate } from './services/ollama';

// 단일 평가
const result = await evaluateWithOllama({
  question_id: "q001",
  question: "대출 금리는 얼마인가요?",
  answer: "현재 대출 금리는 연 3.5%입니다.",
  required_facts: [
    { text: "3.5%", must: true },
    { text: "연", must: false }
  ]
}, 'accuracy');

console.log('정확도 점수:', result.score);

// 배치 평가
const dataset = [
  { question_id: "q001", question: "...", answer: "..." },
  { question_id: "q002", question: "...", answer: "..." }
];

const results = await batchEvaluate(
  dataset,
  ['accuracy', 'relevance'],
  'gemma3:12b'
);
```

## 🎨 커스터마이징 가이드

### 테마 변경
```typescript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a'
        }
      }
    }
  }
}
```

### 새로운 어시스턴트 추가
```typescript
// ChatPage.tsx
const assistantPrompts = {
  // 기존: quick, precise, summary
  custom: {
    general: {
      prompt: "당신은 전문적인 카스텀 어시스턴트입니다...",
      opener: "무엇을 도와드릴까요?"
    },
    rag: {
      prompt: "다음 지식을 바탕으로 답변하세요: {knowledge}",
      opener: "지식베이스를 확인했습니다."
    }
  }
};
```

### 평가 지표 추가
```typescript
// services/ollama.ts
const EVALUATION_PROMPTS = {
  // 기존: accuracy, relevance, readability, privacy
  completeness: `
    평가 지표: "완성도"

    [RULES]
    1. answer_coverage (0/1): 질문의 모든 부분이 답변되었는가?
    2. detail_sufficiency (0/1): 충분한 세부사항이 제공되었는가?

    [OUTPUT JSON SCHEMA]
    {
      "question_id": "{{question_id}}",
      "answer_coverage": 0 | 1,
      "detail_sufficiency": 0 | 1,
      "weighted_completeness": 0.000
    }
  `
};
```

## 📋 문제 해결 가이드

### 자주 발생하는 이슈

#### 1. 세션 복원 실패
```bash
문제: 브라우저 새로고침 후 채팅 내역 사라짐
해결: localStorage 확인 및 RAGFlow API 연결 상태 점검
```

#### 2. 파일 업로드 실패
```bash
문제: 파일 드래그 앤 드롭이 동작하지 않음
해결: 파일 형식(PDF, DOCX, TXT) 및 크기(10MB 이하) 확인
```

#### 3. 지식베이스 연결 오류
```bash
문제: 지식베이스 적용 후에도 일반 답변만 제공
해결: RAG 모드 프롬프트 설정 및 데이터셋 ID 확인
```

#### 4. 평가 시스템 오류
```bash
문제: Ollama 평가 시 연결 실패
해결: Ollama 서버 상태 확인 (http://localhost:11435)
```

### 디버깅 팁

#### 개발자 도구 활용
```javascript
// 브라우저 콘솔에서 현재 세션 정보 확인
console.log('현재 세션:', localStorage.getItem('hana_current_session'));
console.log('메시지 이력:', localStorage.getItem('hana_messages_' + sessionId));

// API 요청 모니터링
// Network 탭에서 RAGFlow API 호출 상태 확인

// 컴포넌트 상태 확인
// React Developer Tools 확장 프로그램 사용
```

## 🚀 배포 가이드

### Vercel 배포
```bash
# 1. Vercel CLI 설치
npm i -g vercel

# 2. 프로젝트 연결
vercel link

# 3. 환경변수 설정
vercel env add VITE_RAGFLOW_API_URL
vercel env add VITE_RAGFLOW_API_KEY

# 4. 배포
vercel --prod
```

### Docker 배포
```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

이 가이드를 통해 HanaNav AI Chat Frontend의 모든 기능을 효과적으로 활용하실 수 있습니다. 추가 질문이나 지원이 필요한 경우 개발팀에 문의해 주세요.