import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        rd: {
          bg:      '#f8f3f0',
          border:  '#ead8d0',
          surface: '#ead8d0',
          accent:  '#d4b0a8',
          text:    '#5c3e38',
          muted:   '#b88880',
          nav:     '#5c3e38',
          dark:    '#4a3230',
        },
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(92,62,56,0.08)',
        'card-hover': '0 4px 20px rgba(92,62,56,0.14)',
      },
      borderRadius: {
        card: '10px',
      },
    },
  },
  plugins: [],
};
export default config;
