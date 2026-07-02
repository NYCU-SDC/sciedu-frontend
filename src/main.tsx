import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import posthog from "posthog-js";
import { PostHogProvider } from "@posthog/react";
import "./index.css";
import App from "./App.tsx";

const POSTHOG_TOKEN = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

if (POSTHOG_TOKEN && POSTHOG_HOST)
    posthog.init(POSTHOG_TOKEN, {
        api_host: POSTHOG_HOST,
        defaults: "2026-01-30",
    });

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <PostHogProvider client={posthog}>
            <App />
        </PostHogProvider>
    </StrictMode>
);
