# Font Verification Manual Checklist 📋

## 🎯 완료 기준
- **전체 텍스트**: Noto Sans Korean 폰트 적용
- **네비게이션 토글**: SVG 아이콘 (더 이상 '?' 문자 아님)
- **접근성**: 키보드 포커스 및 스크린 리더 지원
- **폰트 합성 방지**: 브라우저 자동 굵기 생성 비활성화

## ✅ 화면별 폰트 확인

### 홈 화면 (/)
| 요소 | 예상 폰트 | 확인 방법 | 상태 |
|------|-----------|-----------|------|
| 메인 헤딩 "어디로 떠나시겠어요?" | Noto Sans KR | DevTools Computed | [ ] |
| 검색창 플레이스홀더 | Noto Sans KR | 입력 필드 클릭 후 확인 | [ ] |
| "상황별 프리셋 경로" 섹션 | Noto Sans KR | 섹션 제목 우클릭 → 검사 | [ ] |
| "부서별 자주 찾는 항목" 섹션 | Noto Sans KR | 섹션 제목 우클릭 → 검사 | [ ] |
| 카드 내용 텍스트 | Noto Sans KR | 카드 텍스트 우클릭 → 검사 | [ ] |

### 라이브러리 화면 (/library)
| 요소 | 예상 폰트 | 확인 방법 | 상태 |
|------|-----------|-----------|------|
| 페이지 제목 | Noto Sans KR | 제목 우클릭 → 검사 | [ ] |
| 채팅 히스토리 목록 | Noto Sans KR | 리스트 아이템 검사 | [ ] |
| 버튼 텍스트 | Noto Sans KR | 버튼 우클릭 → 검사 | [ ] |

### 지식베이스 화면 (/documents)
| 요소 | 예상 폰트 | 확인 방법 | 상태 |
|------|-----------|-----------|------|
| 데이터셋 테이블 | Noto Sans KR | 테이블 셀 검사 | [ ] |
| 입력 필드 | Noto Sans KR | 입력 필드 클릭 후 확인 | [ ] |
| 탭 라벨 | Noto Sans KR | 탭 우클릭 → 검사 | [ ] |

### 운영콘솔 화면 (/laaj)
| 요소 | 예상 폰트 | 확인 방법 | 상태 |
|------|-----------|-----------|------|
| 메트릭 카드 | Noto Sans KR | 카드 내용 검사 | [ ] |
| 테이블 데이터 | Noto Sans KR | 테이블 우클릭 → 검사 | [ ] |
| 차트 라벨 | Noto Sans KR | 차트 요소 검사 | [ ] |

## ⚙️ 네비게이션 토글 검증

### 기능 테스트
| 항목 | 예상 동작 | 확인 방법 | 상태 |
|------|-----------|-----------|------|
| **아이콘 표시** | SVG 아이콘 (chevron) | 토글 버튼 검사, '?' 문자 없음 | [ ] |
| **클릭 동작** | 사이드바 열기/닫기 | 버튼 클릭 시 애니메이션 | [ ] |
| **접근성** | aria-label 제공 | 스크린 리더 테스트 | [ ] |
| **키보드 포커스** | Tab 키로 포커스 | 포커스 링 표시 | [ ] |
| **애니메이션** | 부드러운 전환 | 150-220ms 애니메이션 | [ ] |

### 시각적 확인
- [ ] 토글 버튼에 SVG 아이콘이 렌더링됨
- [ ] '?' 또는 다른 텍스트 문자가 표시되지 않음
- [ ] 호버 시 적절한 시각적 피드백
- [ ] 접힌 상태에서 chevron-right, 펼친 상태에서 chevron-left

## 🔍 DevTools 검증 명령어

### 1. 전역 폰트 패밀리 확인
```javascript
getComputedStyle(document.body).fontFamily
// 결과: "Noto Sans KR", "Apple SD Gothic Neo", ...
```

### 2. 폰트 합성 확인
```javascript
getComputedStyle(document.body).fontSynthesis
// 결과: "none" (폰트 합성 비활성화)
```

### 3. 네비게이션 토글 확인
```javascript
const toggle = document.querySelector('[aria-label*="navigation"]');
const hasSVG = !!toggle?.querySelector('svg');
const hasText = toggle?.textContent?.includes('?');
console.log('Has SVG:', hasSVG, 'Has ? text:', hasText);
```

### 4. 자동 테스트 실행
```javascript
// 브라우저 콘솔에서 실행
FontVerification.runAll()
```

## 🚨 문제 해결

### 폰트가 적용되지 않는 경우
1. **브라우저 캐시 클리어**: Ctrl+Shift+R (하드 리로드)
2. **폰트 파일 로드 확인**: Network 탭에서 NotoSansKR-Variable.woff2 확인
3. **CSS 우선순위 확인**: DevTools에서 font-family override 확인

### 네비게이션 토글 문제
1. **SVG 아이콘 확인**: 버튼 내부에 \`<svg>\` 요소 존재
2. **접근성 속성**: aria-label 및 aria-expanded 확인
3. **클릭 이벤트**: 버튼 클릭 시 사이드바 상태 변경

## ✅ 최종 검증 기준

모든 체크박스가 완료되면:
- ✅ **전체 폰트**: Noto Sans Korean 일관 적용
- ✅ **아이콘 시스템**: SVG 기반, 텍스트 의존성 제거
- ✅ **접근성**: 키보드 및 스크린 리더 지원
- ✅ **성능**: 로컬 폰트 파일, 최적화된 로딩

---

## 🧪 실행 명령어

```bash
# 개발 서버 시작
npm run dev

# 브라우저에서 http://localhost:3003 접속
# DevTools Console에서 실행:
FontVerification.runAll()
```