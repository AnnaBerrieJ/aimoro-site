import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#c40000',
          dark: '#950000',
          light: '#fff1f1',
        },
      },
      fontFamily: {
        sans: ['"Sora"', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 10px 28px rgba(17,24,39,0.05)',
        'card-hover': '0 16px 36px rgba(17,24,39,0.09)',
        btn: '0 8px 20px rgba(196,0,0,0.22)',
        'btn-hover': '0 10px 24px rgba(196,0,0,0.3)',
      },
      borderRadius: {
        card: '18px',
      },
    },
  },
  plugins: [],
}

export default config
