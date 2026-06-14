/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Krypt green/black theme
        krypt: {
          bg:        '#0a0a0a',
          sidebar:   '#0f0f0f',
          panel:     '#141414',
          surface:   '#1a1a1a',
          elevated:  '#222222',
          border:    '#2a2a2a',
          green:     '#39ff6a',
          'green-dim': '#2bc455',
          'green-dark': '#1a7a38',
          muted:     '#6b6b6b',
          subtle:    '#3a3a3a',
          text:      '#e8e8e8',
          'text-muted': '#9a9a9a',
        }
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'pulse-green': 'pulseGreen 2s infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseGreen: { '0%, 100%': { boxShadow: '0 0 0 0 rgba(57,255,106,0.4)' }, '50%': { boxShadow: '0 0 0 6px rgba(57,255,106,0)' } },
      }
    },
  },
  plugins: [],
}
