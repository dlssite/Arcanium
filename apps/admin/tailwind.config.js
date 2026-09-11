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
        admin: {
          bg: '#0B0813',
          surface: '#120E1C',
          card: '#181326',
          'card-hover': '#211A34',
          border: '#2A223D',
          'border-light': '#3B3056',
          text: '#F3EFFC',
          muted: '#9E94B3',
          dim: '#6D6282',
        },
        arcanium: {
          purple: '#8B5CF6',
          'purple-glow': '#A78BFA',
          'purple-deep': '#5D497D',
          amber: '#F59E0B',
          'amber-glow': '#FBBF24',
          emerald: '#10B981',
          rose: '#F43F5E',
          cyan: '#06B6D4',
          plum: '#312344',
        }
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'admin-card': '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(139, 92, 246, 0.08)',
        'admin-glow': '0 0 25px -5px rgba(139, 92, 246, 0.25)',
        'amber-glow': '0 0 25px -5px rgba(245, 158, 11, 0.25)',
      }
    },
  },
  plugins: [],
};
