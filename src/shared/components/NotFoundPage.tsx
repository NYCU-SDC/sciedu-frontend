import { Atom } from "lucide-react";
import { Link } from "react-router";

import styles from "./NotFoundPage.module.css";

export default function NotFoundPage() {
    return (
        <div className={styles.page}>
            <div className={styles.digits}>
                <span>4</span>
                <Atom className={styles.atom} strokeWidth={1.5} aria-hidden />
                <span>4</span>
            </div>
            <h1 className={styles.title}>找不到這個頁面</h1>
            <p className={styles.subtitle}>
                網頁不見囉！可能是被刪掉、搬家了，或者是網址輸入錯誤。
            </p>
            <Link to="/" className={styles.homeButton}>
                回到首頁
            </Link>
        </div>
    );
}
