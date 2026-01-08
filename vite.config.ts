import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
<<<<<<< HEAD
=======
import { fileURLToPath, URL } from "node:url";
>>>>>>> 4b28030 (feat: create pages initialize chat and chat content)

export default defineConfig({
    plugins: [react()],
<<<<<<< HEAD
=======
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
>>>>>>> 4b28030 (feat: create pages initialize chat and chat content)
});
