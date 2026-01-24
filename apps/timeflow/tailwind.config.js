/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        tf: {
          bg: {
            primary: "#0B0B14",
            secondary: "#121225",
            tertiary: "#1A1A33",
          },
          text: {
            primary: "#FFFFFF",
            secondary: "#C7C9E3",
            muted: "#8A8DB3",
          },
          input: {
            bg: "#121225",
            border: "#1A1A33",
            placeholder: "#8A8DB3",
            focus: "#7C3AED",
            filled: "#3B82F6",
            error: "#EF4444",
            success: "#22C55E",
            disabledBg: "#0F1020",
            disabledBorder: "#1A1A2E",
            disabledText: "#6B6E91",
          },

          blue: "#3B82F6",
          purple: "#7C3AED",
          pink: "#EC4899",

          success: "#22C55E",
          warning: "#F59E0B",
          error: "#EF4444",
          info: "#38BDF8",
        },
      },
      backgroundImage: {
        "tf-gradient":
          "linear-gradient(135deg, #3B82F6 0%, #7C3AED 50%, #EC4899 100%)",
      },
    },
  },
  plugins: [],
};
