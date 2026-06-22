/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#bcd2ff',
          300: '#8fb3ff',
          400: '#5c8bff',
          500: '#3b6bff',
          600: '#274ce0',
          700: '#1f3cb3',
          800: '#1d3590',
          900: '#1b2f73',
        },
        surface: {
          light: '#ffffff',
          dark: '#0f1115',
          darkAlt: '#161922',
          border: '#23262f',
        },
      },
      boxShadow: {
        soft: '0 4px 24px rgba(0,0,0,0.08)',
        softDark: '0 4px 24px rgba(0,0,0,0.4)',
      },
      borderRadius: {
        xl2: '1rem',
      },
    },
  },
  plugins: [],
};
