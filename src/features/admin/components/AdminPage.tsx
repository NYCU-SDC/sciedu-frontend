import type { ReactNode } from "react";

import styles from "./AdminLayout.module.css";

export default function AdminPage({ children }: { children: ReactNode }) {
    return <div className={styles.content}>{children}</div>;
}
