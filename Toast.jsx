/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}'],
  darkMode: 'media', // suit automatiquement le thème du téléphone
  theme: {
    extend: {
      colors: {
        primary: '#FF5722',
      },
      keyframes: {
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-down': 'slide-down 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
