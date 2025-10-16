/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#edf6ff',
          100: '#d7e9ff',
          200: '#b7d6ff',
          300: '#86bbff',
          400: '#4e97ff',
          500: '#1f78ff',
          600: '#0c5ee5',
          700: '#064bd0',
          800: '#083fab',
          900: '#0d3889',
        },
      },
    },
  },
  plugins: [],
};
