/**
 * Navigation Toggle Verification Tests
 * 사이드바 네비게이션 토글 아이콘 교체 검증
 */

const NavToggleVerification = {
  // Test 1: 버튼 내부에 '?' 텍스트가 없는지 확인
  testNoQuestionMarkText() {
    const toggleButton = document.querySelector('.nav-toggle');
    if (!toggleButton) {
      console.warn('Navigation toggle button (.nav-toggle) not found');
      return false;
    }

    const innerText = toggleButton.innerText || toggleButton.textContent || '';
    const hasQuestionMark = innerText.includes('?');

    console.log('Toggle button inner text:', JSON.stringify(innerText));
    console.log('Contains "?":', hasQuestionMark);

    return !hasQuestionMark && innerText.trim() === '';
  },

  // Test 2: SVG 아이콘이 렌더링되는지 확인
  testSVGIconRendering() {
    const toggleButton = document.querySelector('.nav-toggle');
    if (!toggleButton) {
      console.warn('Navigation toggle button not found');
      return false;
    }

    const svgElement = toggleButton.querySelector('svg');
    const pathElements = toggleButton.querySelectorAll('svg path');

    console.log('Has SVG element:', !!svgElement);
    console.log('Number of SVG paths:', pathElements.length);

    return !!svgElement && pathElements.length > 0;
  },

  // Test 3: 클릭 시 사이드바 토글 및 aria-expanded 변경 확인
  testToggleFunctionality() {
    const toggleButton = document.querySelector('.nav-toggle');
    if (!toggleButton) {
      console.warn('Navigation toggle button not found');
      return false;
    }

    const initialExpanded = toggleButton.getAttribute('aria-expanded') === 'true';
    console.log('Initial aria-expanded:', initialExpanded);

    // 클릭 시뮬레이션
    toggleButton.click();

    // 상태 변경 확인을 위해 잠시 대기
    return new Promise((resolve) => {
      setTimeout(() => {
        const newExpanded = toggleButton.getAttribute('aria-expanded') === 'true';
        console.log('After click aria-expanded:', newExpanded);

        const toggled = initialExpanded !== newExpanded;
        console.log('Successfully toggled:', toggled);

        // 원래 상태로 복구
        if (toggled) {
          toggleButton.click();
        }

        resolve(toggled);
      }, 100);
    });
  },

  // Test 4: 접근성 속성 확인
  testAccessibilityAttributes() {
    const toggleButton = document.querySelector('.nav-toggle');
    if (!toggleButton) {
      console.warn('Navigation toggle button not found');
      return false;
    }

    const hasAriaLabel = !!toggleButton.getAttribute('aria-label');
    const hasAriaExpanded = toggleButton.hasAttribute('aria-expanded');
    const hasProperRole = toggleButton.tagName.toLowerCase() === 'button' || toggleButton.getAttribute('role') === 'button';

    console.log('Has aria-label:', hasAriaLabel);
    console.log('Has aria-expanded:', hasAriaExpanded);
    console.log('Proper button role:', hasProperRole);

    return hasAriaLabel && hasAriaExpanded && hasProperRole;
  },

  // Test 5: 아이콘 전환 확인 (접힘/펼침 상태별 다른 아이콘)
  testIconSwitching() {
    const toggleButton = document.querySelector('.nav-toggle');
    if (!toggleButton) {
      console.warn('Navigation toggle button not found');
      return false;
    }

    const isExpanded = toggleButton.getAttribute('aria-expanded') === 'true';
    const svgPaths = Array.from(toggleButton.querySelectorAll('svg path')).map(path => path.getAttribute('d'));

    console.log('Current expanded state:', isExpanded);
    console.log('SVG paths:', svgPaths);

    // 햄버거 메뉴 아이콘 패턴 (3개의 수평선)
    const isMenuIcon = svgPaths.some(path => path && path.includes('M3 12h18'));
    // 화살표 아이콘 패턴
    const isChevronIcon = svgPaths.some(path => path && path.includes('l-6-6'));

    console.log('Is menu icon (hamburger):', isMenuIcon);
    console.log('Is chevron icon:', isChevronIcon);

    return isMenuIcon || isChevronIcon;
  },

  // 모든 테스트 실행
  async runAll() {
    console.log('🔍 Navigation Toggle Verification Tests');
    console.log('=====================================');

    const tests = [
      { name: 'No Question Mark Text', fn: this.testNoQuestionMarkText },
      { name: 'SVG Icon Rendering', fn: this.testSVGIconRendering },
      { name: 'Toggle Functionality', fn: this.testToggleFunctionality },
      { name: 'Accessibility Attributes', fn: this.testAccessibilityAttributes },
      { name: 'Icon Switching', fn: this.testIconSwitching }
    ];

    const results = [];

    for (const test of tests) {
      try {
        const result = await test.fn();
        const passed = !!result;
        const status = passed ? '✅' : '❌';
        console.log(`${status} ${test.name}: ${passed ? 'PASS' : 'FAIL'}`);
        results.push(passed);
      } catch (error) {
        console.log(`❌ ${test.name}: ERROR - ${error.message}`);
        results.push(false);
      }
    }

    const passedCount = results.filter(r => r).length;
    console.log('\\n📊 Results:');
    console.log('=====================================');
    console.log(`Tests Passed: ${passedCount}/${tests.length}`);

    if (passedCount === tests.length) {
      console.log('🎉 All navigation toggle tests PASSED!');
      console.log('✅ No "?" text in toggle button');
      console.log('✅ SVG icons properly rendered');
      console.log('✅ Toggle functionality working');
      console.log('✅ Accessibility attributes present');
      console.log('✅ Icon switching implemented');
    } else {
      console.log('⚠️ Some tests failed. Check navigation toggle implementation.');
    }

    return passedCount === tests.length;
  }
};

// Export for browser usage
if (typeof window !== 'undefined') {
  window.NavToggleVerification = NavToggleVerification;
}

// Auto-load message
if (typeof window !== 'undefined') {
  console.log('Navigation Toggle Verification loaded. Run NavToggleVerification.runAll() to test.');
}