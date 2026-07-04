import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        paper: "#fcfbff",
        graphite: "#6b7280",
        copper: "#ec4899",
        forest: "#7c3aed",
        skyglass: "#f5f0ff",
        violetline: "#eceaf4",
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444"
      },
      boxShadow: {
        panel: "0 18px 55px rgba(124, 58, 237, 0.08)",
        lift: "0 16px 40px rgba(17, 24, 39, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
