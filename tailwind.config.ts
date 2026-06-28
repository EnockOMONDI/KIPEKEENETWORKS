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
        paper: "#f7f5ef",
        graphite: "#30343b",
        copper: "#a85f36",
        forest: "#1e5f4f",
        skyglass: "#d7edf2"
      },
      boxShadow: {
        panel: "0 18px 60px rgba(17, 24, 39, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
