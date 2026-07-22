import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const VALID_MODES = ["edu", "llm", "dev"];
const VALID_CONTENT_TARGETS = ["dev", "local"];

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");

    const appMode = env.VITE_APP_MODE;
    if (!VALID_MODES.includes(appMode)) {
        throw new Error(
            `Invalid VITE_APP_MODE: "${appMode}". Must be one of: ${VALID_MODES.join(", ")}`
        );
    }
    const contentTarget = env.VITE_CONTENT_TARGET || "dev";
    if (!VALID_CONTENT_TARGETS.includes(contentTarget)) {
        throw new Error(
            `Invalid VITE_CONTENT_TARGET: "${contentTarget}". Must be one of: ${VALID_CONTENT_TARGETS.join(", ")}`
        );
    }
    const geneticsResource = resolve(
        process.cwd(),
        `src/features/courses/genetics/assets/courseResource.generated.${contentTarget}.ts`
    );
    if (!existsSync(geneticsResource)) {
        throw new Error(
            `Genetics Course ${contentTarget} mapping is missing. Run the SCIEDU-99 importer and export ${contentTarget} artifacts first.`
        );
    }
    return {
        plugins: [react()],
        resolve: {
            alias: {
                "@genetics-course-resource": geneticsResource,
            },
        },
    };
});
