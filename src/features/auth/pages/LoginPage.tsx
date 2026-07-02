import { useEffect } from "react";
import { useNavigate } from "react-router";

import { useAuth } from "../../../shared/auth";
import { useDocumentTitle } from "../../../shared/hooks";
import Logo from "../../../shared/components/Logo";
import styles from "./LoginPage.module.css";

function GoogleIcon() {
    return (
        <svg
            className={styles.googleIcon}
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            <path
                fill="#4285F4"
                d="M21.6 12.23c0-.78-.07-1.53-.2-2.23H12v4.26h5.38a4.6 4.6 0 0 1-1.99 3.02v2.77h3.22c1.88-1.74 2.99-4.29 2.99-7.82Z"
            />
            <path
                fill="#34A853"
                d="M12 22c2.7 0 4.96-.9 6.61-2.45l-3.22-2.77c-.9.6-2.04.95-3.39.95-2.6 0-4.8-1.76-5.59-4.12H3.08v2.86A9.98 9.98 0 0 0 12 22Z"
            />
            <path
                fill="#FBBC05"
                d="M6.41 13.61a6 6 0 0 1 0-3.82V6.93H3.08a10.01 10.01 0 0 0 0 8.94l3.33-2.26Z"
            />
            <path
                fill="#EA4335"
                d="M12 6.07c1.47 0 2.78.5 3.82 1.49l2.86-2.86C16.95 3.1 14.7 2.13 12 2.13a9.98 9.98 0 0 0-8.92 5.54l3.33 2.26C7.2 7.83 9.4 6.07 12 6.07Z"
            />
        </svg>
    );
}

export default function LoginPage() {
    const { login, isAuthenticated, isLoading } = useAuth();
    const navigate = useNavigate();

    useDocumentTitle("登入");

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            navigate("/", { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate]);

    return (
        <div className={styles.page}>
            <header className={styles.brand}>
                <Logo className={styles.brandIcon} />
                <span className={styles.brandName}>SciLLM</span>
            </header>

            <main className={styles.loginArea}>
                <section
                    className={styles.loginPanel}
                    aria-labelledby="login-title"
                >
                    <div className={styles.intro}>
                        <h1 id="login-title" className={styles.heading}>
                            您好，歡迎回來
                        </h1>
                        <p className={styles.subtitle}>
                            繼續使用 SciLLM 的學習
                        </p>
                    </div>

                    <button
                        type="button"
                        className={styles.googleButton}
                        onClick={() => login("google")}
                    >
                        <GoogleIcon />
                        <span>使用 Google 帳號繼續</span>
                    </button>

                    <p className={styles.legalText}>
                        登入即表示您同意<span>服務條款</span>與
                        <span>隱私權政策</span>
                    </p>
                </section>
            </main>
        </div>
    );
}
