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
      sm: "3px",
      DEFAULT: "3px",
      md: "3px",
      lg: "3px",
      xl: "3px",
      "2xl": "3px",
      "3xl": "3px",
      full: "3px",
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
