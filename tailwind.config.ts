import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          light: '#f8fafc',
          DEFAULT: '#0b0f14',
        },
        surface: {
          light: '#ffffff',
          DEFAULT: '#121821',
        },
        primary: {
          DEFAULT: '#7dd3fc',
          foreground: '#0b0f14',
        },
        muted: {
          light: '#e2e8f0',
          DEFAULT: '#334155',
        },
        pill: {
          light: 'rgb(241 245 249)',
          DEFAULT: 'rgb(241 245 249 / 0.2)',
        },
        border: {
          light: '#e2e8f0',
          DEFAULT: '#334155',
        },
      },
      backgroundColor: {
        'surface/60': 'rgba(18, 24, 33, 0.6)',
        'surface/80': 'rgba(18, 24, 33, 0.8)',
      },
      borderRadius: {
        pill: '9999px',
      },
    },
  },
  variants: {
    extend: {
      backgroundColor: ['dark'],
      textColor: ['dark'],
      borderColor: ['dark'],
    },
  },
  plugins: [],
}
export default config
