/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        campus: {
          bg: '#090c10',
          surface: '#11161d',
          card: '#161c24',
          elevated: '#1c242e',
          border: '#252f3d',
          accent: '#10b981',
          accentHover: '#059669',
          accentGlow: 'rgba(16, 185, 129, 0.14)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}

