import { defineConfig } from "vite";

export default defineConfig({
    server: {
        host: "localhost",
        port: 3000,
        strictPort: true,
        fs: {
            allow: [
                import.meta.dirname,
                "/Users/eason/Uni/SDC/SciEdu/腦機介面",
            ],
        },
    },
});
