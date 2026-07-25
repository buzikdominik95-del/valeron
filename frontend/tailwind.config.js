/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,vue,jsx,cjs,mjs,ts,tsx,cts,mtsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
      }
    },
  },
  plugins: [],
}
