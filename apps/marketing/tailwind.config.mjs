/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        arcanium: {
          bg: '#FAF8F5',
          cream: '#F4EFEB',
          parchment: '#FAF6EE',
          card: '#FFFFFF',
          plum: '#433258',
          'plum-dark': '#312344',
          purple: '#5D497D',
          'purple-light': '#7D67A3',
          'purple-subtle': '#EFEBFA',
          'purple-pill': '#523F71',
          amber: '#DE9B35',
          'amber-light': '#FBF3E8',
          'amber-badge': '#F39C12',
          text: '#2D253A',
          muted: '#80778B',
          'muted-light': '#A79FAF',
          border: '#EBE6DE',
          'border-subtle': '#F2ECE4',
          // Dark mode palette (matching apps/web)
          'dark-bg': '#120E18',
          'dark-surface': '#1A1423',
          'dark-card': '#20192C',
          'dark-border': '#312740',
          'dark-text': '#F1ECF7',
          'dark-muted': '#9E94AB',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft-card': '0 4px 24px -2px rgba(67, 50, 88, 0.06), 0 2px 8px -1px rgba(0, 0, 0, 0.03)',
        'dark-card': '0 4px 24px -2px rgba(0, 0, 0, 0.45), 0 2px 8px -1px rgba(0, 0, 0, 0.3)',
        'float-button': '0 10px 28px -4px rgba(93, 73, 125, 0.35)',
        'subtle': '0 2px 10px rgba(0, 0, 0, 0.04)',
        'glow-purple': '0 0 40px -8px rgba(93, 73, 125, 0.35)',
        'glow-amber': '0 0 35px -6px rgba(222, 155, 53, 0.25)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.02)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 4s ease-in-out infinite',
        'float': 'float 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
