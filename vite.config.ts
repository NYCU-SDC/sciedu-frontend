import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";

const VALID_MODES = ["edu", "llm"];

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");

    const appMode = env.VITE_APP_MODE;
    if (!VALID_MODES.includes(appMode)) {
        throw new Error(
            `Invalid VITE_APP_MODE: "${appMode}". Must be one of: ${VALID_MODES.join(", ")}`
        );
    }
    return {
        plugins: [react()],
    };
});
