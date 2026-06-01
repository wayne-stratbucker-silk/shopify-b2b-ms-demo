import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#f7f6f2",
        "bg-alt": "#efede5",
        surface: "#ffffff",
        "surface-2": "#faf9f5",
        ink: "#131820",
        "ink-2": "#3a4250",
        muted: "#76808c",
        "muted-2": "#aab1ba",
        line: "#e6e3d9",
        "line-2": "#d6d2c5",
        primary: "#1a3a5c",
        "primary-ink": "#0f2640",
        "primary-fade": "#eef2f7",
        warn: "#8a5a0e",
        "warn-fade": "#f7eed8",
        danger: "#8a2a2a",
        "danger-fade": "#f6e6e3",
        success: "#2e6b46",
        "success-fade": "#e9efe9",
        info: "#1f4d7a",
        "info-fade": "#e6edf4",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter Tight", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular"],
      },
      fontSize: {
        h0: ["48px", { lineHeight: "1.05", letterSpacing: "-0.025em" }],
        h1: ["32px", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        h2: ["22px", { lineHeight: "1.2", letterSpacing: "-0.015em" }],
        h3: ["18px", { lineHeight: "1.3" }],
        h4: ["15px", { lineHeight: "1.4" }],
        body: ["14px", { lineHeight: "1.5" }],
        sm: ["13px", { lineHeight: "1.5" }],
        xs: ["12px", { lineHeight: "1.4" }],
        mini: ["11px", { lineHeight: "1.4" }],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "4px",
        md: "6px",
        lg: "6px",
      },
      maxWidth: {
        container: "1360px",
      },
    },
  },
  plugins: [],
};

export default config;
