/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
    "./index.html"
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        primary: {
          50: 'var(--primary-50)',
          100: 'var(--primary-100)',
          200: 'var(--primary-200)',
          300: 'var(--primary-300)',
          400: 'var(--primary-400)',
          500: 'var(--primary-500)',
          600: 'var(--primary-600)',
          700: 'var(--primary-700)',
          800: 'var(--primary-800)',
          900: 'var(--primary-900)',
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        gray: {
          50: 'var(--gray-50)',
          100: 'var(--gray-100)',
          200: 'var(--gray-200)',
          300: 'var(--gray-300)',
          400: 'var(--gray-400)',
          500: 'var(--gray-500)',
          600: 'var(--gray-600)',
          700: 'var(--gray-700)',
          800: 'var(--gray-800)',
          900: 'var(--gray-900)',
        },
        success: {
          50: 'var(--success-50)',
          500: 'var(--success-500)',
          600: 'var(--success-600)',
          700: 'var(--success-700)',
        },
        warning: {
          50: 'var(--warning-50)',
          500: 'var(--warning-500)',
          600: 'var(--warning-600)',
          700: 'var(--warning-700)',
        },
        error: {
          50: 'var(--error-50)',
          500: 'var(--error-500)',
          600: 'var(--error-600)',
          700: 'var(--error-700)',
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "seg-track": "var(--seg-track)",
        "seg-track-border": "var(--seg-track-border)",
        "seg-label-muted": "var(--seg-label-muted)",
        "seg-thumb": "var(--seg-thumb)",
      },
      boxShadow: {
        'xs': 'var(--shadow-xs)',
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
        'glass': 'var(--glass-shadow)',
        'seg-track': 'var(--seg-track-shadow)',
      },
      backdropBlur: {
        'xs': 'var(--blur-sm)',
        'sm': 'var(--blur-sm)',
        'md': 'var(--blur-md)',
        'lg': 'var(--blur-lg)',
        'xl': 'var(--blur-xl)',
      },
      transitionDuration: {
        '75': 'var(--duration-75)',
        '100': 'var(--duration-100)',
        '150': 'var(--duration-150)',
        '200': 'var(--duration-200)',
        '300': 'var(--duration-300)',
        '500': 'var(--duration-500)',
        '700': 'var(--duration-700)',
        '1000': 'var(--duration-1000)',
      },
      transitionTimingFunction: {
        'bounce': 'var(--ease-bounce)',
        'spring': 'var(--ease-spring)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Noto Sans KR", "Apple SD Gothic Neo", "Noto Sans", "system-ui", "sans-serif"],
        body: ["Noto Sans KR", "Apple SD Gothic Neo", "Noto Sans", "system-ui", "sans-serif"],
        display: ["Noto Sans KR", "Apple SD Gothic Neo", "Noto Sans", "system-ui", "sans-serif"],
      },
      fontWeight: {
        thin: '100',
        extralight: '200',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
        sm: ['0.875rem', { lineHeight: '1.375rem' }], // 14px/22px
        base: ['1rem', { lineHeight: '1.73rem' }],    // 16px/~28px
        lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
        xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
        '3xl': ['1.75rem', { lineHeight: '2.25rem' }], // 28px
        '4xl': ['2rem', { lineHeight: '2.6rem' }],    // 32px/40px (h2)
        '5xl': ['2.5rem', { lineHeight: '3rem' }],    // 40px
        '6xl': ['3rem', { lineHeight: '3.6rem' }],    // 48px/56px (h1)
        '7xl': ['3.5rem', { lineHeight: '4.3rem' }],  // 56px
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function({ addUtilities }) {
      addUtilities({
        '.focus-ring': {
          '&:focus-visible': {
            outline: 'var(--focus-ring-width) var(--focus-ring-style) var(--focus-ring-color)',
            'outline-offset': 'var(--focus-ring-offset)',
            'box-shadow': '0 0 0 var(--focus-ring-offset) var(--background), 0 0 0 calc(var(--focus-ring-offset) + var(--focus-ring-width)) var(--focus-ring-color)',
          },
        },
        '.glass-morphism': {
          background: 'var(--glass-bg)',
          'backdrop-filter': 'var(--blur-md)',
          '-webkit-backdrop-filter': 'var(--blur-md)',
          border: '1px solid var(--glass-border)',
          'box-shadow': 'var(--glass-shadow)',
        },
        '.text-gradient': {
          background: 'linear-gradient(135deg, var(--primary-500) 0%, var(--primary-600) 100%)',
          '-webkit-background-clip': 'text',
          'background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
        },
        // Typography utility classes temporarily removed for debugging
      })
    },
  ],
}