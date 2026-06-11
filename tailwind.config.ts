import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2EA056',
          50:  '#f0faf4',
          100: '#d8f3e3',
          200: '#b3e6ca',
          300: '#80d2a8',
          400: '#4bb981',
          500: '#2EA056',
          600: '#208043',
          700: '#1a6535',
          800: '#16502b',
          900: '#124224',
        },
        dark: {
          bg:      '#111111',
          surface: '#1a1a1a',
          border:  '#2a2a2a',
          text:    '#f3f4f6',
          muted:   '#9ca3af',
        },
      },
      fontFamily: {
        sans:    ['var(--font-dm-sans)', 'DM Sans', 'sans-serif'],
        heading: ['var(--font-sora)', 'Sora', 'sans-serif'],
      },
      screens: {
        xs: '380px',
      },
    },
  },
  plugins: [],
};

export default config;
