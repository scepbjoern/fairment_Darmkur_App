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
        background: '#0b0f14',
        surface: '#121821',
        primary: {
          DEFAULT: '#7dd3fc',
          foreground: '#0b0f14',
        },
        muted: '#334155',
        pill: '#1f2937',
      },
      borderRadius: {
        pill: '9999px',
      },
    },
  },
  plugins: [],
}
export default config
