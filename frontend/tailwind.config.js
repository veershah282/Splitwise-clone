/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'splitwise-green': '#1cc29f',
        'splitwise-dark': '#333333',
        'splitwise-light': '#f6f6f6',
      }
    },
  },
  plugins: [],
}
