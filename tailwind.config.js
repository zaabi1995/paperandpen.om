/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          500: '#2d6a4f',
          600: '#1e5c42',
          700: '#14532d',
        },
        amber: {
          100: '#fef3c7',
          400: '#f4a261',
          500: '#e76f51',
          600: '#d4622e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        arabic: ['"IBM Plex Arabic"', '"Noto Sans Arabic"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
