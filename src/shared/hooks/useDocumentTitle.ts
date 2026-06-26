import { useEffect } from "react";

const APP_NAME = "SciEdu";

/**
 * Sets `document.title` to `"<title> - SciEdu"` while the component is mounted.
 * Passing an empty or undefined title falls back to just the app name.
 */
export function useDocumentTitle(title?: string) {
    useEffect(() => {
        document.title = title ? `${title} - ${APP_NAME}` : APP_NAME;
        return () => {
            document.title = APP_NAME;
        };
    }, [title]);
}
