/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    borderRadius: {
      none: "0px",
      sm: "2px",
      DEFAULT: "4px",
      md: "4px",
      lg: "6px",
      xl: "8px",
      "2xl": "10px",
      "3xl": "12px",
      full: "9999px",
    },
    extend: {
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Inter",
          "Noto Sans SC",
          "PingFang SC",
          "Microsoft YaHei",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      container: {
        center: true,
      },
    },
  },
  plugins: [],
};
