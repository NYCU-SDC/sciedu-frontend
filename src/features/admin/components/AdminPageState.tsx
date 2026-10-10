import type { ReactNode } from "react";

import styles from "./AdminLayout.module.css";

export default function AdminPageState({ children }: { children: ReactNode }) {
    return <div className={styles.pageState}>{children}</div>;
}
