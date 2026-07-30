import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#bae0fd",
          300: "#7cc5fb",
          400: "#36a5f7",
          500: "#0c87eb",
          600: "#026ac9",
          700: "#0354a2",
          800: "#074785",
          900: "#0c3c6e",
          950: "#082649",
        },
        slate: {
          850: "#172033",
          950: "#0b1120",
        }
      },
    },
  },
  plugins: [],
};
export default config;

