/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        landing: {
          deep: "hsl(var(--landing-deep))",
          teal: "hsl(var(--landing-teal))",
          ocean: "hsl(var(--landing-ocean))",
          sand: "hsl(var(--landing-sand))",
          gold: "hsl(var(--landing-gold))",
        },
      },
      backgroundImage: {
        "landing-hero": "radial-gradient(ellipse 80% 60% at 50% -10%, hsl(var(--landing-teal) / 0.18), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 0%, hsl(var(--landing-gold) / 0.12), transparent 50%)",
        "landing-mesh": "linear-gradient(135deg, hsl(var(--landing-deep)) 0%, hsl(var(--landing-ocean)) 50%, hsl(var(--landing-teal)) 100%)",
      },
      boxShadow: {
        landing: "0 25px 50px -12px hsl(var(--landing-deep) / 0.25)",
        "landing-soft": "0 4px 24px -4px hsl(var(--landing-deep) / 0.12)",
      },
    },
  },
  plugins: [],
};
