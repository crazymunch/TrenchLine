import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-base)",
        foreground: "var(--color-primary)",
        "theme-base": "var(--bg-base)",
        "theme-surface": "var(--bg-surface)",
        "theme-elevated": "var(--bg-elevated)",
        "theme-card": "var(--bg-card)",
        "theme-primary": "var(--color-primary)",
        "theme-primary-hover": "var(--color-primary-hover)",
        "theme-border": "var(--color-border)",
        "theme-accent": "var(--color-accent)",
      },
    },
  },
  plugins: [],
};

export default config;
