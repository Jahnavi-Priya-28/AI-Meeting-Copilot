/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Dark navy command-center palette
        navy: {
          950: '#050c1a',
          900: '#090f1e',
          800: '#0e1628',
          700: '#141e35',
          600: '#1c2a47',
          500: '#243358',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        slate: {
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
        },
        rose: {
          400: '#fb7185',
          500: '#f43f5e',
        }
      },
      fontFamily: {
        // Display: editorial serif for headings
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        // Body: clean geometric sans
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        // Code/data: monospace for transcripts
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'slide-in-right': 'slideInRight 0.35s ease-out forwards',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'shimmer': 'shimmer 2s infinite',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        }
      },
      backgroundImage: {
        'grid-navy': `
          linear-gradient(rgba(36,51,88,0.4) 1px, transparent 1px),
          linear-gradient(90deg, rgba(36,51,88,0.4) 1px, transparent 1px)
        `,
      },
      backgroundSize: {
        'grid': '32px 32px',
      }
    },
  },
  plugins: [],
}
