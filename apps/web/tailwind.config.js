/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        arcanium: {
          bg: '#FAF8F5',
          cream: '#F4EFEB',
          card: '#FFFFFF',
          plum: '#433258',
          'plum-dark': '#312344',
          purple: '#5D497D',
          'purple-subtle': '#EFEBFA',
          'purple-pill': '#523F71',
          amber: '#DE9B35',
          'amber-light': '#FBF3E8',
          'amber-badge': '#F39C12',
          text: '#2D253A',
          muted: '#80778B',
          'muted-light': '#A79FAf',
          border: '#EBE6DE',
          'bubble-user': '#4A3764',
          'bubble-ai': '#F3EFEA',
          // Dark mode palette
          'dark-bg': '#120E18',
          'dark-surface': '#1A1423',
          'dark-card': '#20192C',
          'dark-border': '#312740',
          'dark-text': '#F1ECF7',
          'dark-muted': '#9E94AB',
        }
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft-card': '0 4px 20px -2px rgba(67, 50, 88, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
        'dark-card': '0 4px 24px -2px rgba(0, 0, 0, 0.35)',
        'float-button': '0 8px 24px -4px rgba(67, 50, 88, 0.35)',
        'subtle': '0 2px 8px rgba(0, 0, 0, 0.03)',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom, 16px)',
      },
      keyframes: {
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in':  'fade-in 0.2s ease-out forwards',
      },
    },
  },
  plugins: [],
}
