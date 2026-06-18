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
        portal: {
          primary: "#1a4b8c",
          "primary-dark": "#153d73",
          accent: "#f5a623",
          "accent-light": "#ffd54f",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 16px rgba(15, 23, 42, 0.08)",
        elevated: "0 12px 32px rgba(15, 23, 42, 0.12)",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
      backgroundImage: {
        "portal-banner": "url('/images/portal-banner.png')",
      },
    },
  },
  plugins: [],
};
export default config;
