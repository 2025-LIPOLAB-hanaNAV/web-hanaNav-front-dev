# Typography & Surface Manual Checklist 📋

## 🎯 목표
`web-hanaNav-front-dev`의 타이포그래피와 표면 디자인이 `web-hanaNav-front` 원본과 **픽셀 레벨로 동일**한지 확인

## 🔍 핵심 변경사항
1. **폰트 패밀리 분리**: Jua는 헤딩만, Inter는 본문
2. **히어로 타이틀**: 56px/70px/800 정확한 수치
3. **카드 표면**: 0.95 알파 + 블러 효과
4. **가중치 다운시프트**: 전반적으로 더 가벼운 폰트

## ✅ 체크리스트

### 1. **Font Loading & Assets**
- [ ] Google Fonts에서 Inter 100-900 전체 가중치 범위 로드 확인
- [ ] Jua 폰트 정상 로드 확인
- [ ] 브라우저 Network 탭에서 폰트 파일 로드 완료 확인
- [ ] FOUT(Flash of Unstyled Text) 최소화 확인

### 2. **Global Typography Settings**

#### 헤딩 (Headings)
| 요소 | 예상 Font Weight | 예상 Font Size | Line Height | 확인 |
|------|------------------|-----------------|-------------|------|
| `h1` | **700** (bold) | 56px (3.5rem) | 1.23 | [ ] |
| `h2` | **600** (semibold) | 32px (2rem) | 1.3 | [ ] |
| `h3` | **600** (semibold) | 24px (1.5rem) | 1.4 | [ ] |
| `h4` | **500** (medium) | 18px (1.125rem) | 1.5 | [ ] |

#### 본문 & UI 요소 (Body & UI)
| 요소 | 예상 Font Weight | 예상 Font Size | Line Height | 확인 |
|------|------------------|-----------------|-------------|------|
| `body` | **400** (normal) | 16px (1rem) | 1.73 | [ ] |
| `p` | **400** (normal) | 16px (1rem) | 1.73 | [ ] |
| `button` | **500** (medium) | 18px (1.125rem) | 1.15 | [ ] |
| `label` | **500** (medium) | 16px (1rem) | 1.5 | [ ] |
| `input` | **400** (normal) | 16px (1rem) | 1.5 | [ ] |

### 3. **Component-Level Checks**

#### HomePage.tsx
- [ ] **메인 헤딩** "어디로 떠나시겠어요?" → `font-bold` (700)
- [ ] **섹션 헤딩** "인기 방문지", "상황별 프리셋 경로" → `font-semibold` (600)
- [ ] **카드 타이틀** → `font-medium` (500)
- [ ] **카드 설명 텍스트** → `font-normal` (400)
- [ ] **부서별 항목 버튼** → `font-medium` (500)

#### AppShell.tsx
- [ ] **"하나 Navi" 로고** → `font-bold` (700)
- [ ] **"정보 탐색 경로 안내"** → `font-medium` (500)
- [ ] **네비게이션 라벨** → `font-medium` (500)

#### Button 컴포넌트들
- [ ] **Search Button** → `font-medium` (500)
- [ ] **FigmaInspiredButton** → `font-medium` (500)
- [ ] **일반 Button 요소** → `font-medium` (500)

### 4. **DevTools 확인 방법**

#### Font Weight 확인
```javascript
// 브라우저 콘솔에서 실행
getComputedStyle(document.querySelector('h1')).fontWeight
// → "700" (bold, 이전 "800" extrabold 아님)

getComputedStyle(document.querySelector('h2')).fontWeight
// → "600" (semibold)

getComputedStyle(document.body).fontWeight
// → "400" (normal)

getComputedStyle(document.querySelector('button')).fontWeight
// → "500" (medium, 이전 "700" bold 아님)
```

#### Font Family 확인
```javascript
getComputedStyle(document.body).fontFamily
// → "Jua", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif
```

### 5. **Accessibility & Rendering**
- [ ] **Font Synthesis 비활성화**: 브라우저가 합성 Bold 생성하지 않음 확인
- [ ] **Text Rendering**: 텍스트가 선명하고 읽기 쉬움 (antialiasing 적용)
- [ ] **Responsive**: 모바일/데스크톱에서 동일한 font weight 유지
- [ ] **Dark Mode**: 다크 모드에서도 font weight 일관성 유지

### 6. **Performance Checks**
- [ ] **Font Loading Speed**: 초기 로드 시 1초 이내 폰트 렌더링
- [ ] **No FOUT**: 폰트 로드 중 스타일 깜빡임 없음
- [ ] **Network Optimized**: Google Fonts preload 및 비동기 로딩 적용

---

## 🧪 자동 테스트 실행

```bash
# 개발 서버 시작
npm run dev

# 브라우저에서 http://localhost:3001 접속
# DevTools Console에서 실행:
TypographyTests.runAll()
```

## ⚠️ 실패 시 점검 사항

### Bold가 여전히 강하게 보이는 경우:
1. **브라우저 캐시 클리어** 후 재확인
2. **Google Fonts 로딩** Network 탭에서 100-300 가중치 확인
3. **CSS 특이도 충돌** DevTools Elements에서 override 확인
4. **font-synthesis** 설정이 제거되었는지 확인

### 테스트 통과 기준:
- ✅ **모든 h1**: font-weight ≤ 700 (bold)
- ✅ **모든 h2/h3**: font-weight ≤ 600 (semibold)
- ✅ **모든 button**: font-weight ≤ 600 (medium~semibold)
- ✅ **모든 body/p**: font-weight = 400 (normal)
- ✅ **폰트 패밀리**: Jua, Inter 정상 로드

---

## 🎉 완료 기준
**모든 체크박스 ✅ + 자동 테스트 100% 통과** = 원본 repo와 타이포그래피 동일화 완료!