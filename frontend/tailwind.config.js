/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d6fe',
          300: '#a4bdfc',
          400: '#7c9cf8',
          500: '#5b7bf2',
          600: '#4263e8',
          700: '#3451d1',
          800: '#2c43a9',
          900: '#283b85',
        },
      },
      backgroundColor: {
        'dark-primary': '#111113',
        'dark-secondary': '#1a1a1e',
        'dark-tertiary': '#252529',
      },
      fontSize: {
        'mobile-xs': ['0.8125rem', { lineHeight: '1.25rem' }],
        'mobile-sm': ['0.875rem', { lineHeight: '1.375rem' }],
        'mobile-base': ['1rem', { lineHeight: '1.625rem' }],
      },
    },
  },
  plugins: [],
}
