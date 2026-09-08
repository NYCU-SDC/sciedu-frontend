import { createTheme, type MantineColorsTuple } from "@mantine/core";

const brandTeal: MantineColorsTuple = [
<<<<<<< HEAD
    "var(--color-teal-50)",
    "var(--color-teal-100)",
    "var(--color-teal-200)",
    "var(--color-teal-300)",
    "var(--color-teal-400)",
    "var(--color-brand-teal)",
    "var(--color-teal-800)",
    "var(--color-teal-700)",
    "var(--color-brand-teal-dark)",
    "var(--color-teal-900)",
];

export const mantineTheme = createTheme({
    colors: {
        brandTeal,
    },
    primaryColor: "brandTeal",
=======
    "#eef6f3",
    "#dcece5",
    "#b9dbd0",
    "#93c7b8",
    "#74b7a2",
    "#5aab98",
    "#3d8a76",
    "#2c6f5f",
    "#1f5c50",
    "#143d35",
];

export const theme = createTheme({
    primaryColor: "brandTeal",
    primaryShade: 8,
    colors: { brandTeal },
    fontFamily:
        '"GenYoGothicTW", "Noto Sans TC", -apple-system, BlinkMacSystemFont, sans-serif',
>>>>>>> origin/main
});
