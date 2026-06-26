import { useState } from "react";
import { ChevronDown, TriangleAlert } from "lucide-react";
import { isRouteErrorResponse, useRouteError } from "react-router";

import NotFoundPage from "./NotFoundPage";
import { useDocumentTitle } from "../hooks";
import styles from "./RouteErrorBoundary.module.css";

function getErrorMessage(error: unknown): string {
    if (isRouteErrorResponse(error)) {
        return error.statusText || error.data || "Something went wrong.";
    }
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === "string") {
        return error;
    }
    return "An unexpected error occurred.";
}

export default function RouteErrorBoundary() {
    const error = useRouteError();
    const [showDetails, setShowDetails] = useState(false);

    const is404 = isRouteErrorResponse(error) && error.status === 404;

    // Match the title NotFoundPage sets so the delegated render stays consistent.
    useDocumentTitle(is404 ? "找不到頁面" : "發生錯誤");

    // A thrown 404 response should render the same page as an unmatched route.
    if (is404) {
        return <NotFoundPage />;
    }

    const message = getErrorMessage(error);

    return (
        <div className={styles.page}>
            <div className={styles.iconBox}>
                <TriangleAlert
                    className={styles.icon}
                    strokeWidth={1.5}
                    aria-hidden
                />
            </div>
            <h1 className={styles.title}>出了一點問題</h1>
            <p className={styles.subtitle}>
                畫面發生未預期的錯誤，請重新載入頁面。 若問題反覆出現，請聯繫
                SciEdu 團隊。
            </p>
            <button
                type="button"
                className={styles.reloadButton}
                onClick={() => window.location.reload()}
            >
                重新載入
            </button>
            {message && (
                <>
                    <button
                        type="button"
                        className={styles.detailsToggle}
                        onClick={() => setShowDetails((open) => !open)}
                        aria-expanded={showDetails}
                    >
                        <ChevronDown
                            className={`${styles.chevron} ${showDetails ? styles.chevronOpen : ""}`}
                            aria-hidden
                        />
                        顯示錯誤詳情
                    </button>
                    {showDetails && (
                        <pre className={styles.details}>{message}</pre>
                    )}
                </>
            )}
        </div>
    );
}
