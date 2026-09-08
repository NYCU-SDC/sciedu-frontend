import { createTheme, type MantineColorsTuple } from "@mantine/core";

const brandTeal: MantineColorsTuple = [
    "var(--color-teal-50)",
    "var(--color-teal-100)",
    "var(--color-teal-200)",
    "var(--color-teal-300)",
    "var(--color-teal-400)",
    "var(--color-brand-teal)",
    "var(--color-teal-600)",
    "var(--color-teal-700)",
    "var(--color-brand-teal-dark)",
    "var(--color-teal-950)",
];

export const theme = createTheme({
    primaryColor: "brandTeal",
    primaryShade: 8,
    colors: { brandTeal },
    fontFamily:
        '"GenYoGothicTW", "Noto Sans TC", -apple-system, BlinkMacSystemFont, sans-serif',
});
