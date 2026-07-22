import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
    root: import.meta.dirname,
    plugins: [react()],
    build: {
        outDir: "dist/client",
        emptyOutDir: true,
    },
    test: {
        environment: "node",
    },
});
