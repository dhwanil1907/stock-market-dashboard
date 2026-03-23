/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#00C896',
          red: '#FF4D4F',
          dark:   'rgb(var(--brand-dark) / <alpha-value>)',
          card:   'rgb(var(--brand-card) / <alpha-value>)',
          border: 'rgb(var(--brand-border) / <alpha-value>)',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
