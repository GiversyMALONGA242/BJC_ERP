/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bjc: {
          50:  '#f0f0ff',
          100: '#e0e0fe',
          500: '#534AB7',
          600: '#4238a0',
          700: '#322c82',
          800: '#221e60',
          900: '#141240',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
