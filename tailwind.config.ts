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
      /*
        Channel triplets, not hex, so Tailwind's opacity modifier works:
        `bg-theme-primary/40` needs `rgb(R G B / <alpha-value>)`. The app uses
        257 such modifiers, so a plain `var(--x)` token would silently drop the
        opacity on every one of them.
      */
      colors: {
        background: "rgb(var(--bg-base) / <alpha-value>)",
        foreground: "rgb(var(--color-primary) / <alpha-value>)",
        "theme-base": "rgb(var(--bg-base) / <alpha-value>)",
        "theme-surface": "rgb(var(--bg-surface) / <alpha-value>)",
        "theme-elevated": "rgb(var(--bg-elevated) / <alpha-value>)",
        "theme-card": "rgb(var(--bg-card) / <alpha-value>)",
        "theme-primary": "rgb(var(--color-primary) / <alpha-value>)",
        "theme-primary-hover": "rgb(var(--color-primary-hover) / <alpha-value>)",
        "theme-border": "rgb(var(--color-border) / <alpha-value>)",
        "theme-accent": "rgb(var(--color-accent) / <alpha-value>)",
        "theme-text": "rgb(var(--color-text) / <alpha-value>)",
        "theme-muted": "rgb(var(--color-muted) / <alpha-value>)",
        // Fixed across every theme. See the note in globals.css.
        "status-error": "rgb(var(--status-error) / <alpha-value>)",
        "status-warning": "rgb(var(--status-warning) / <alpha-value>)",
        "status-legal": "rgb(var(--status-legal) / <alpha-value>)",
        /*
          Brand, also fixed, and for the landing page — which renders before a
          warband exists and so has no faction to take an accent from. Never
          `text-brand-oxblood` on the iron ground: that pair is 1.98:1, and
          `text-brand-oxblood-ink` is the 6.10:1 that says the same thing.
        */
        "brand-oxblood": "rgb(var(--brand-oxblood) / <alpha-value>)",
        "brand-oxblood-lit": "rgb(var(--brand-oxblood-lit) / <alpha-value>)",
        "brand-oxblood-ink": "rgb(var(--brand-oxblood-ink) / <alpha-value>)",
        "brand-gold": "rgb(var(--brand-gold) / <alpha-value>)",
        "brand-ground": "rgb(var(--brand-ground) / <alpha-value>)",
        "brand-ground-2": "rgb(var(--brand-ground-2) / <alpha-value>)",
        "brand-hover": "rgb(var(--brand-hover) / <alpha-value>)",
        "brand-line": "rgb(var(--brand-line) / <alpha-value>)",
        "brand-line-2": "rgb(var(--brand-line-2) / <alpha-value>)",
        "brand-body": "rgb(var(--brand-body) / <alpha-value>)",
        "brand-lede": "rgb(var(--brand-lede) / <alpha-value>)",
        "brand-plate": "rgb(var(--brand-plate) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};

export default config;
