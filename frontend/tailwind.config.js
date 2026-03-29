/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0F1F7',
          100: '#E0E2EF',
          200: '#C1C5DF',
          300: '#9198C7',
          400: '#6670AF',
          500: '#3D4890',
          600: '#2A3270',
          700: '#1B1F3B',
          800: '#13162E',
          900: '#0D0F20',
        },
        accent: {
          50: '#FFF0F1',
          100: '#FFD0D3',
          200: '#FFA0A8',
          300: '#F06E7A',
          400: '#E63946',
          500: '#D42D3A',
          600: '#B8202C',
          700: '#8B0000',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F6F6F4',
          border: '#E4E4E0',
          'border-light': '#F0F0EC',
        },
      },
      backgroundColor: {
        'dark-primary': '#0D0F20',
        'dark-secondary': '#13162E',
        'dark-tertiary': '#1B1F3B',
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
