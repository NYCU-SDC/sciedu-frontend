import { createTheme, type MantineColorsTuple } from "@mantine/core";

const brandTeal: MantineColorsTuple = [
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
});
