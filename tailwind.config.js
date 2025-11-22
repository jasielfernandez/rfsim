/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'signal-excellent': '#00d084',
        'signal-good': '#7ed957',
        'signal-fair': '#ffd700',
        'signal-poor': '#ff9500',
        'signal-bad': '#ff4500',
        'signal-dead': '#8b0000',
      },
    },
  },
  plugins: [],
}
