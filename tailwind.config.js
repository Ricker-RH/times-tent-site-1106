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
      sm: "0.5px",
      DEFAULT: "1px",
      md: "1.5px",
      lg: "2px",
      xl: "2.5px",
      "2xl": "3px",
      "3xl": "4px",
      full: "4px",
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
