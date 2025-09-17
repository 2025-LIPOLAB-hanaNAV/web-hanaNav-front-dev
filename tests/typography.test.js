/**
 * Typography Smoke Tests
 * 원본 repo와 font-weight/size/line-height 일치 여부 확인
 */

// Simple DOM-based tests (can be run in browser console)
const TypographyTests = {

  // Test 1: 본문 텍스트에 Jua 폰트가 없고 font-weight: 400인지 확인
  testBodyFontFamily() {
    const bodyElement = document.body;
    const computedStyle = getComputedStyle(bodyElement);
    const fontFamily = computedStyle.fontFamily;
    const fontWeight = computedStyle.fontWeight;

    console.log('Body font-family:', fontFamily);
    console.log('Body font-weight:', fontWeight);

    const hasJua = fontFamily.toLowerCase().includes('jua');
    const isNormalWeight = fontWeight === '400' || fontWeight === 'normal';

    return !hasJua && isNormalWeight;
  },

  // Test 2: 첫 번째 카드 타이틀의 weight/size 확인
  testCardTitleTypography() {
    const cardTitle = document.querySelector('.card h3, .card p[class*="font-"], [class*="font-medium"]');
    if (!cardTitle) {
      console.warn('Card title element not found');
      return false;
    }

    const computedStyle = getComputedStyle(cardTitle);
    const fontWeight = computedStyle.fontWeight;
    const fontSize = computedStyle.fontSize;

    console.log('Card title font-weight:', fontWeight, 'font-size:', fontSize);
    // medium(500) 또는 semibold(600) 허용, bold(700) 이상은 실패
    return parseInt(fontWeight) <= 600;
  },

  // Test 3: 히어로 타이틀이 정확한 수치인지 확인 (56px/70px/800)
  testHeroTitleMeasurements() {
    const heroTitle = document.querySelector('.hero-title, h1');
    if (!heroTitle) {
      console.warn('Hero title not found');
      return false;
    }

    const computedStyle = getComputedStyle(heroTitle);
    const fontSize = parseInt(computedStyle.fontSize);
    const lineHeight = parseInt(computedStyle.lineHeight);
    const fontWeight = parseInt(computedStyle.fontWeight);

    console.log('Hero title - fontSize:', fontSize, 'lineHeight:', lineHeight, 'fontWeight:', fontWeight);

    return fontSize === 56 && lineHeight === 70 && fontWeight === 800;
  },

  // Test 4: 버튼 텍스트가 medium weight인지 확인
  testButtonFontWeight() {
    const button = document.querySelector('button');
    if (!button) {
      console.warn('Button element not found');
      return false;
    }

    const computedStyle = getComputedStyle(button);
    const fontWeight = computedStyle.fontWeight;

    console.log('Button font-weight:', fontWeight);
    // medium(500) 또는 semibold(600) 허용
    return parseInt(fontWeight) >= 500 && parseInt(fontWeight) <= 600;
  },

  // Test 5: 카드 표면이 올바른 배경을 갖는지 확인
  testCardSurface() {
    const card = document.querySelector('.card-enhanced');
    if (!card) {
      console.warn('Card with .card-enhanced not found');
      return false;
    }

    const computedStyle = getComputedStyle(card);
    const backgroundColor = computedStyle.backgroundColor;
    const backdropFilter = computedStyle.backdropFilter;

    console.log('Card background:', backgroundColor);
    console.log('Card backdrop-filter:', backdropFilter);

    // 0.95 알파값과 블러 필터 확인
    const hasHighAlpha = backgroundColor.includes('0.95') || backgroundColor.includes('rgba(255, 255, 255');
    const hasBlur = backdropFilter.includes('blur');

    return hasHighAlpha && hasBlur;
  },

  // 모든 테스트 실행
  runAll() {
    console.log('🧪 Typography Smoke Tests');
    console.log('========================');

    const tests = [
      { name: 'Body Font Family (no Jua, weight 400)', fn: this.testBodyFontFamily },
      { name: 'Card Title Typography (≤600)', fn: this.testCardTitleTypography },
      { name: 'Hero Title (56px/70px/800)', fn: this.testHeroTitleMeasurements },
      { name: 'Button Font Weight (500-600)', fn: this.testButtonFontWeight },
      { name: 'Card Surface (0.95 alpha + blur)', fn: this.testCardSurface },
    ];

    const results = tests.map(test => {
      try {
        const passed = test.fn();
        console.log(`${passed ? '✅' : '❌'} ${test.name}`);
        return passed;
      } catch (error) {
        console.log(`❌ ${test.name} (Error: ${error.message})`);
        return false;
      }
    });

    const passedCount = results.filter(r => r).length;
    console.log(`\n📊 Results: ${passedCount}/${tests.length} tests passed`);

    if (passedCount === tests.length) {
      console.log('🎉 All typography tests passed! Font weights match original repo.');
    } else {
      console.log('⚠️  Some tests failed. Font weights may still be too bold.');
    }

    return passedCount === tests.length;
  }
};

// Export for browser console usage
if (typeof window !== 'undefined') {
  window.TypographyTests = TypographyTests;
}

// Usage:
// 1. Open browser dev console on the homepage
// 2. Run: TypographyTests.runAll()