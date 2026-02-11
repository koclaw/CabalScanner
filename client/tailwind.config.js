/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'sans-serif'],
      },
      colors: {
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb', // Borders
          300: '#d1d5db',
          500: '#6b7280', // Secondary text
          900: '#111827', // Primary text
        },
        green: {
          50: '#f0fdf4',
          100: '#dcfce7',
          300: '#86efac', // Heatmap light
          500: '#22c55e', // Heatmap medium
          600: '#16a34a', // Primary action
          700: '#15803d', // Heatmap dark
          900: '#14532d',
        }
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
      }
    },
  },
  plugins: [],
}