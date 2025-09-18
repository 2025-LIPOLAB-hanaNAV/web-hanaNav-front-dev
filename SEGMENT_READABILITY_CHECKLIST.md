# Segment/Radio Background Readability Checklist 📋

## 🎯 완료 기준
- **배경 밝기**: 기존 어두운 회색에서 밝은 회색으로 변경
- **텍스트 대비**: WCAG AA 기준 4.5:1 이상 달성
- **활성 상태**: 브랜드 보라색 pill 스타일 유지
- **애니메이션**: 탭 전환 시 부드러운 전환 효과 유지

## ✅ 시각적 확인

### 지식베이스 화면 (/documents)
| 요소 | 기대값 | 확인 방법 | 상태 |
|------|--------|-----------|------|
| **탭 트랙 배경** | 밝은 회색 (#f8fafc) | 상단 탭 컨테이너 배경 | [ ] |
| **비활성 라벨** | 회색 텍스트, 읽기 쉬움 | "문서/벡터DB/데이터셋" 텍스트 | [ ] |
| **활성 pill** | 보라색 배경, 흰색 텍스트 | 선택된 탭 스타일 | [ ] |
| **테두리/그림자** | 미세한 테두리, 부드러운 그림자 | 탭 컨테이너 가장자리 | [ ] |

### 운영콘솔 화면 (/laaj)
| 요소 | 기대값 | 확인 방법 | 상태 |
|------|--------|-----------|------|
| **탭 트랙 배경** | 밝은 회색 (#f8fafc) | 상단 탭 컨테이너 배경 | [ ] |
| **비활성 라벨** | 회색 텍스트, 읽기 쉬움 | "개요/평가 데이터/품질 평가" 텍스트 | [ ] |
| **활성 pill** | 보라색 배경, 흰색 텍스트 | 선택된 탭 스타일 | [ ] |
| **호버 효과** | 텍스트 색상 변화 | 탭에 마우스 올릴 때 | [ ] |

## 🔍 접근성 확인

### 대비율 테스트 (WCAG AA 기준)
| 조합 | 요구 기준 | 확인 방법 | 상태 |
|------|-----------|-----------|------|
| 비활성 텍스트 vs 트랙 배경 | ≥ 4.5:1 | DevTools에서 대비율 확인 | [ ] |
| 활성 텍스트 vs pill 배경 | ≥ 4.5:1 | 보라색 pill 대비율 확인 | [ ] |

### 키보드 접근성
- [ ] Tab 키로 탭 간 이동 가능
- [ ] Enter/Space로 탭 선택 가능
- [ ] 포커스 시 시각적 표시 (링)

## 🎨 다크 모드 확인

### 다크 모드 전환
| 모드 | 트랙 배경 | 텍스트 색상 | 상태 |
|------|-----------|-------------|------|
| **라이트** | 밝은 회색 (#f8fafc) | 중간 회색 (#64748b) | [ ] |
| **다크** | 중간 회색 (#334155) | 밝은 회색 (#94a3b8) | [ ] |

## 🔧 DevTools 확인 명령어

### 1. 배경색 확인
```javascript
const tabsList = document.querySelector('[data-slot="tabs-list"]');
const bgColor = getComputedStyle(tabsList).backgroundColor;
console.log('Tab track background:', bgColor);
```

### 2. 대비율 계산
```javascript
const track = document.querySelector('[data-slot="tabs-list"]');
const trigger = track?.querySelector('[data-slot="tabs-trigger"]:not([data-state="active"])');
const trackBg = getComputedStyle(track).backgroundColor;
const textColor = getComputedStyle(trigger).color;
console.log('Background:', trackBg, 'Text:', textColor);
```

### 3. 활성 탭 확인
```javascript
const active = document.querySelector('[data-slot="tabs-trigger"][data-state="active"]');
const activeBg = getComputedStyle(active).backgroundColor;
const activeText = getComputedStyle(active).color;
console.log('Active - Background:', activeBg, 'Text:', activeText);
```

## 🧪 자동 테스트 실행

### 브라우저 콘솔에서 실행
```javascript
// 모든 접근성 테스트 실행
SegmentAccessibilityTests.runAll()

// 개별 테스트 실행
SegmentAccessibilityTests.testBrighterBackground()
SegmentAccessibilityTests.testTextContrast()
SegmentAccessibilityTests.testActivePillStyle()
SegmentAccessibilityTests.testTabSwitchAnimation()
```

## 🚨 문제 해결

### 배경이 여전히 어두운 경우
1. **브라우저 캐시**: 하드 리로드 (Ctrl+Shift+R)
2. **CSS 토큰**: `--seg-track` 값이 올바른지 확인
3. **Tailwind 컴파일**: 새로운 클래스가 생성되었는지 확인

### 대비율이 부족한 경우
1. **토큰 조정**: `--seg-label-muted` 색상을 더 진하게
2. **배경 조정**: `--seg-track` 색상을 더 밝게
3. **다크 모드**: 다크 모드 토큰 별도 조정

### 활성 pill이 보이지 않는 경우
1. **Primary 색상**: `--primary` 토큰 확인
2. **텍스트 색상**: `--seg-thumb` (흰색) 적용 확인
3. **애니메이션**: transition 속성 유지 확인

## ✅ 최종 검증 기준

### 라이트 모드
- ✅ **트랙 배경**: #f8fafc (밝은 회색)
- ✅ **비활성 텍스트**: #64748b, 대비율 ≥ 4.5:1
- ✅ **활성 pill**: 보라색 배경 + 흰색 텍스트

### 다크 모드
- ✅ **트랙 배경**: #334155 (중간 회색)
- ✅ **비활성 텍스트**: #94a3b8, 대비율 ≥ 4.5:1
- ✅ **활성 pill**: 보라색 배경 + 흰색 텍스트

---

## 🎉 완료 기준

모든 체크박스 ✅ + 자동 테스트 100% 통과 = 세그먼트 배경 가독성 개선 완료!

### 실행 명령어
```bash
# 개발 서버 시작
npm run dev

# 브라우저에서 확인
# http://localhost:3003/documents (지식베이스)
# http://localhost:3003/laaj (운영콘솔)

# DevTools Console에서 테스트
SegmentAccessibilityTests.runAll()
```