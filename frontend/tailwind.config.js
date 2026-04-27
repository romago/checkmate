/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        notes: {
          yellow: '#FFD60A',
          bg: '#FAF9F6',
          sidebar: '#F2F1EE',
          border: '#E5E5EA',
          text: '#1C1C1E',
          muted: '#8E8E93',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
