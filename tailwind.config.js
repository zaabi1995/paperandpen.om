/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Ink navy — primary brand
        ink: {
          50:  '#f0f3f9',
          100: '#dde3f0',
          200: '#bcc8e3',
          300: '#8ea2cc',
          500: '#1e2d5a',
          600: '#172347',
          700: '#101a36',
          900: '#080e1f',
        },
        // Warm cream / ivory — backgrounds
        cream: {
          50:  '#fdfaf5',
          100: '#faf4e8',
          200: '#f5e9d0',
          300: '#edd5ab',
          400: '#e0bb7e',
          500: '#c9973f',
        },
        // Copper accent
        copper: {
          300: '#d4956a',
          400: '#c07840',
          500: '#a85f25',
          600: '#8c4e1c',
        },
        // Keep brand as alias for ink for legacy refs
        brand: {
          50:  '#f0f3f9',
          100: '#dde3f0',
          200: '#bcc8e3',
          300: '#8ea2cc',
          500: '#1e2d5a',
          600: '#172347',
          700: '#101a36',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        arabic: ['"IBM Plex Arabic"', '"Noto Sans Arabic"', 'sans-serif'],
      },
      backgroundImage: {
        'paper-texture': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease forwards',
        'fade-in': 'fadeIn 0.5s ease forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
