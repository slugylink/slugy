import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        // Custom gradients for bio themes
        'radial-ellipse-bottom-amber-violet-sky': 'radial-gradient(ellipse at bottom, #fbbf24, #8b5cf6, #06b6d4)',
        'conic-bottom-amber-red-zinc': 'conic-gradient(from 180deg at 50% 100%, #fbbf24, #ef4444, #71717a)',
        'conic-top-gray': 'conic-gradient(from 0deg at 50% 0%, #6b7280, #374151, #1f2937)',
        'animated-rainbow': 'linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)',
      },
      animation: {
        'rainbow': 'rainbow 3s ease-in-out infinite',
      },
      keyframes: {
        rainbow: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
