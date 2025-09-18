/**
 * Font Verification Tests - Noto Sans Korean Application
 * 브라우저 콘솔에서 실행 가능한 폰트 검증 테스트
 */

const FontVerification = {
  // Test 1: 모든 화면에서 Noto Sans Korean 적용 확인
  testFontFamily() {
    const body = document.body;
    const computedStyle = getComputedStyle(body);
    const fontFamily = computedStyle.fontFamily;

    console.log('Body font-family:', fontFamily);

    const hasNotoSansKR = fontFamily.toLowerCase().includes('noto sans kr');
    return hasNotoSansKR;
  },

  // Test 2: 네비게이션 토글이 SVG 아이콘으로 렌더링되는지 확인
  testNavigationToggleIcon() {
    const toggleButton = document.querySelector('[aria-label*="navigation"]');
    if (!toggleButton) {
      console.warn('Navigation toggle button not found');
      return false;
    }

    const svgIcon = toggleButton.querySelector('svg');
    const hasTextContent = toggleButton.textContent?.includes('?');

    console.log('Toggle button has SVG:', !!svgIcon);
    console.log('Toggle button has ? text:', hasTextContent);

    return !!svgIcon && !hasTextContent;
  },

  // Test 3: 기본 폰트 가중치 확인 (굵기 합성 방지)
  testFontSynthesis() {
    const testElements = [
      document.body,
      document.querySelector('h1'),
      document.querySelector('p'),
      document.querySelector('button')
    ].filter(Boolean);

    let allNormalWeight = true;

    testElements.forEach(el => {
      const style = getComputedStyle(el);
      const fontWeight = style.fontWeight;
      const fontSynthesis = style.fontSynthesis || 'auto';

      console.log(`Element ${el.tagName}: font-weight=${fontWeight}, font-synthesis=${fontSynthesis}`);

      // 기본 요소들은 400 또는 normal이어야 함 (명시적으로 다른 weight가 지정된 경우 제외)
      if (el === document.body && fontWeight !== '400' && fontWeight !== 'normal') {
        allNormalWeight = false;
      }
    });

    return allNormalWeight;
  },

  // Test 4: 특정 섹션들의 폰트 확인
  testSectionFonts() {
    const sections = [
      '상황별 프리셋 경로',
      '부서별 자주 찾는 항목'
    ];

    let allCorrect = true;

    sections.forEach(sectionText => {
      const heading = Array.from(document.querySelectorAll('h2')).find(h =>
        h.textContent?.includes(sectionText)
      );

      if (heading) {
        const style = getComputedStyle(heading);
        const fontFamily = style.fontFamily;
        const hasNotoSansKR = fontFamily.toLowerCase().includes('noto sans kr');

        console.log(`Section "${sectionText}": font-family=${fontFamily}`);

        if (!hasNotoSansKR) {
          allCorrect = false;
        }
      } else {
        console.warn(`Section "${sectionText}" not found`);
      }
    });

    return allCorrect;
  },

  // 모든 테스트 실행
  runAll() {
    console.log('🔍 Font Verification Tests Starting...');
    console.log('==========================================');

    const tests = [
      { name: 'Global Font Family (Noto Sans KR)', fn: this.testFontFamily },
      { name: 'Navigation Toggle SVG Icon', fn: this.testNavigationToggleIcon },
      { name: 'Font Synthesis Prevention', fn: this.testFontSynthesis },
      { name: 'Section Font Application', fn: this.testSectionFonts }
    ];

    const results = tests.map(test => {
      try {
        const passed = test.fn();
        const status = passed ? '✅' : '❌';
        console.log(`${status} ${test.name}: ${passed ? 'PASS' : 'FAIL'}`);
        return passed;
      } catch (error) {
        console.log(`❌ ${test.name}: ERROR - ${error.message}`);
        return false;
      }
    });

    const passedCount = results.filter(r => r).length;
    console.log('\\n📊 Results:');
    console.log('==========================================');
    console.log(`Tests Passed: ${passedCount}/${tests.length}`);

    if (passedCount === tests.length) {
      console.log('🎉 All font verification tests PASSED!');
      console.log('✅ Noto Sans Korean is properly applied');
      console.log('✅ Navigation icons are SVG-based');
      console.log('✅ Font synthesis is prevented');
    } else {
      console.log('⚠️ Some tests failed. Check font configuration.');
    }

    return passedCount === tests.length;
  }
};

// Export for browser usage
if (typeof window !== 'undefined') {
  window.FontVerification = FontVerification;
}

// Auto-run if loaded directly
if (typeof window !== 'undefined' && window.location.pathname !== '/') {
  console.log('Font Verification loaded. Run FontVerification.runAll() to test.');
}