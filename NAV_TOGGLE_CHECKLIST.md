# Navigation Toggle Verification Checklist 🔧

## 🎯 완료 기준
- **아이콘 표시**: '?' 문자 제거, SVG 아이콘으로 교체
- **상태별 아이콘**: 열림(ChevronLeft) ↔ 닫힘(Menu) 전환
- **접근성**: aria-label, aria-expanded, 키보드 포커스
- **애니메이션**: 180ms 부드러운 전환, 호버/액티브 효과

## ✅ 시각적 확인

### 기본 표시
- [ ] 토글 버튼에 '?' 문자가 표시되지 않음
- [ ] SVG 아이콘이 선명하게 렌더링됨
- [ ] 아이콘이 버튼 중앙에 정렬됨
- [ ] 적절한 크기 (16px)로 표시됨

### 상태별 아이콘 전환
| 사이드바 상태 | 예상 아이콘 | 확인 방법 | 상태 |
|---------------|-------------|-----------|------|
| **펼쳐짐** | ChevronLeft (←) | 사이드바가 열린 상태에서 확인 | [ ] |
| **접혀짐** | Menu (≡) | 사이드바가 닫힌 상태에서 확인 | [ ] |

### 인터랙션
- [ ] **클릭**: 부드러운 사이드바 열기/닫기
- [ ] **호버**: scale-105 확대 효과
- [ ] **액티브**: scale-95 축소 효과
- [ ] **포커스**: 키보드 포커스 링 표시

## 🔍 DevTools 검증

### 1. DOM 구조 확인
```javascript
// 버튼 요소 확인
const button = document.querySelector('.nav-toggle');
console.log('Button found:', !!button);

// SVG 요소 확인
const svg = button?.querySelector('svg');
console.log('SVG found:', !!svg);

// 텍스트 내용 확인 (비어있어야 함)
console.log('Button text:', button?.innerText);
```

### 2. 접근성 속성 확인
```javascript
const button = document.querySelector('.nav-toggle');
console.log('aria-label:', button?.getAttribute('aria-label'));
console.log('aria-expanded:', button?.getAttribute('aria-expanded'));
console.log('Button type:', button?.type);
```

### 3. 아이콘 전환 확인
```javascript
// 현재 아이콘 패턴 확인
const paths = Array.from(document.querySelectorAll('.nav-toggle svg path'));
const pathData = paths.map(p => p.getAttribute('d'));
console.log('Current icon paths:', pathData);
```

## 🧪 자동 테스트 실행

### 브라우저 콘솔에서 실행
```javascript
// 모든 검증 테스트 실행
NavToggleVerification.runAll()

// 개별 테스트 실행
NavToggleVerification.testNoQuestionMarkText()
NavToggleVerification.testSVGIconRendering()
NavToggleVerification.testToggleFunctionality()
```

## 🚨 문제 해결

### '?' 문자가 여전히 표시되는 경우
1. **브라우저 캐시 클리어**: Ctrl+Shift+R
2. **CSS 확인**: ::before/::after content 규칙
3. **아이콘 폰트 제거**: 웹폰트 의존성 확인

### SVG 아이콘이 보이지 않는 경우
1. **컴포넌트 import 확인**: MenuIcon, ChevronLeftIcon
2. **SVG 속성 확인**: currentColor, 올바른 크기
3. **z-index 문제**: 오버레이에 가려지는지 확인

### 클릭이 작동하지 않는 경우
1. **이벤트 핸들러**: onClick 함수 연결 확인
2. **포인터 이벤트**: pointer-events: auto 설정
3. **오버레이 간섭**: 상위 요소의 클릭 차단 확인

## ✅ 최종 검증 체크리스트

### 기능 테스트
- [ ] 사이드바 열기/닫기 정상 작동
- [ ] 아이콘이 상태에 따라 전환됨
- [ ] 애니메이션이 부드럽게 작동함
- [ ] 키보드로 접근 가능 (Tab 키)

### 접근성 테스트
- [ ] 스크린 리더에서 올바른 라벨 읽음
- [ ] aria-expanded 상태 정확히 반영
- [ ] 키보드 포커스 시 시각적 표시

### 시각적 테스트
- [ ] 라이트/다크 모드에서 모두 정상 표시
- [ ] 다양한 브라우저에서 일관된 렌더링
- [ ] 모바일/데스크톱 반응형 동작

---

## 🎉 완료 기준

모든 체크박스 ✅ + 자동 테스트 100% 통과 = 네비게이션 토글 아이콘 교체 완료!

### 실행 명령어
```bash
# 개발 서버 실행
npm run dev

# 브라우저에서 http://localhost:3003 접속
# DevTools Console에서:
NavToggleVerification.runAll()
```