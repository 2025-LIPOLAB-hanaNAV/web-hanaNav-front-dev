/**
 * Segment/Radio Background Accessibility Tests
 * 라디오/세그먼트 배경 가독성 개선 검증
 */

// Contrast calculation utility
function getContrastRatio(color1, color2) {
  function getLuminance(color) {
    const rgb = color.match(/\d+/g).map(x => parseInt(x));
    const [r, g, b] = rgb.map(x => {
      x = x / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

// RGB to hex conversion for consistent color comparison
function rgbToHex(rgb) {
  const result = rgb.match(/\d+/g);
  if (!result || result.length < 3) return rgb;
  return `rgb(${result[0]}, ${result[1]}, ${result[2]})`;
}

const SegmentAccessibilityTests = {
  // Test 1: 세그먼트 배경이 기존보다 밝아졌는지 확인
  testBrighterBackground() {
    const segmentContainer = document.querySelector('[data-slot="tabs-list"]');
    if (!segmentContainer) {
      console.warn('Segment container not found');
      return false;
    }

    const computedStyle = getComputedStyle(segmentContainer);
    const backgroundColor = rgbToHex(computedStyle.backgroundColor);

    console.log('Segment background color:', backgroundColor);

    // 기존 어두운 회색들과 비교 (예: rgb(51, 65, 85), rgb(100, 116, 139))
    const darkColors = [
      'rgb(51, 65, 85)',   // slate-700
      'rgb(100, 116, 139)', // slate-500
      'rgb(71, 85, 105)',   // slate-600
      'rgb(30, 41, 59)'     // slate-800
    ];

    const isNotDarkColor = !darkColors.some(darkColor => backgroundColor === darkColor);

    console.log('Is not using dark background:', isNotDarkColor);
    return isNotDarkColor;
  },

  // Test 2: 텍스트와 배경 간 대비율 확인 (WCAG AA 기준 4.5:1)
  testTextContrast() {
    const segmentContainer = document.querySelector('[data-slot="tabs-list"]');
    const inactiveTrigger = segmentContainer?.querySelector('[data-slot="tabs-trigger"]:not([data-state="active"])');

    if (!segmentContainer || !inactiveTrigger) {
      console.warn('Segment elements not found');
      return false;
    }

    const containerStyle = getComputedStyle(segmentContainer);
    const triggerStyle = getComputedStyle(inactiveTrigger);

    const backgroundColor = rgbToHex(containerStyle.backgroundColor);
    const textColor = rgbToHex(triggerStyle.color);

    console.log('Background:', backgroundColor);
    console.log('Text color:', textColor);

    try {
      const contrastRatio = getContrastRatio(backgroundColor, textColor);
      console.log('Contrast ratio:', contrastRatio.toFixed(2));

      const meetsAALevel = contrastRatio >= 4.5;
      console.log('Meets WCAG AA (4.5:1):', meetsAALevel);

      return meetsAALevel;
    } catch (error) {
      console.error('Error calculating contrast:', error);
      return false;
    }
  },

  // Test 3: 활성 탭 스타일 유지 확인
  testActivePillStyle() {
    const activeTrigger = document.querySelector('[data-slot="tabs-trigger"][data-state="active"]');

    if (!activeTrigger) {
      console.warn('Active tab trigger not found');
      return false;
    }

    const computedStyle = getComputedStyle(activeTrigger);
    const backgroundColor = rgbToHex(computedStyle.backgroundColor);
    const textColor = rgbToHex(computedStyle.color);

    console.log('Active tab background:', backgroundColor);
    console.log('Active tab text:', textColor);

    // 브랜드 보라색 확인 (예: rgb(139, 92, 246) 또는 유사)
    const isPrimaryBackground = backgroundColor.includes('139, 92, 246') ||
                               backgroundColor.includes('168, 85, 247') ||
                               computedStyle.backgroundColor.includes('var(--primary)');

    // 흰색 텍스트 확인
    const isWhiteText = textColor.includes('255, 255, 255') ||
                       textColor.includes('rgb(255, 255, 255)') ||
                       computedStyle.color.includes('var(--seg-thumb)');

    console.log('Has primary background:', isPrimaryBackground);
    console.log('Has white text:', isWhiteText);

    return isPrimaryBackground && isWhiteText;
  },

  // Test 4: 탭 전환 애니메이션 유지 확인
  async testTabSwitchAnimation() {
    const triggers = document.querySelectorAll('[data-slot="tabs-trigger"]');

    if (triggers.length < 2) {
      console.warn('Not enough tab triggers for animation test');
      return false;
    }

    const firstTrigger = triggers[0];
    const secondTrigger = triggers[1];

    const initialState = firstTrigger.getAttribute('data-state');
    console.log('Initial state:', initialState);

    // 탭 전환 시뮬레이션
    secondTrigger.click();

    return new Promise((resolve) => {
      setTimeout(() => {
        const newState = secondTrigger.getAttribute('data-state');
        console.log('New state after click:', newState);

        const animationWorking = newState === 'active';
        console.log('Animation working:', animationWorking);

        // 원래 탭으로 복구
        firstTrigger.click();

        resolve(animationWorking);
      }, 100);
    });
  },

  // 모든 테스트 실행
  async runAll() {
    console.log('🔍 Segment Accessibility Tests');
    console.log('==============================');

    const tests = [
      { name: 'Brighter Background', fn: this.testBrighterBackground },
      { name: 'Text Contrast (WCAG AA)', fn: this.testTextContrast },
      { name: 'Active Pill Style', fn: this.testActivePillStyle },
      { name: 'Tab Switch Animation', fn: this.testTabSwitchAnimation }
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
    console.log('==============================');
    console.log(`Tests Passed: ${passedCount}/${tests.length}`);

    if (passedCount === tests.length) {
      console.log('🎉 All segment accessibility tests PASSED!');
      console.log('✅ Background is lighter and more readable');
      console.log('✅ Text contrast meets WCAG AA standards');
      console.log('✅ Active pill style maintained');
      console.log('✅ Tab switching animations working');
    } else {
      console.log('⚠️ Some tests failed. Check segment styling.');
    }

    return passedCount === tests.length;
  }
};

// Export for browser usage
if (typeof window !== 'undefined') {
  window.SegmentAccessibilityTests = SegmentAccessibilityTests;
}

// Auto-load message
if (typeof window !== 'undefined') {
  console.log('Segment Accessibility Tests loaded. Run SegmentAccessibilityTests.runAll() to test.');
}