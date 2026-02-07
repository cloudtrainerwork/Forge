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
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      height: {
        'screen-safe': '100vh',
        'canvas': 'calc(100vh - 64px)', // Account for header if needed
      },
      minHeight: {
        'screen-safe': '100vh',
        'canvas': 'calc(100vh - 64px)',
      },
      cursor: {
        'grab': 'grab',
        'grabbing': 'grabbing',
      }
    },
  },
  plugins: [],
};
export default config;
