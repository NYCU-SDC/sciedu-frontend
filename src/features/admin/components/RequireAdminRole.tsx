import type { JSX } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchCurrentUser } from "../services/adminRepository";
import styles from "../pages/AdminDashboardPage.module.css";

export default function RequireAdminRole({
    children,
}: {
    children: JSX.Element;
}) {
    const userQuery = useQuery({
        queryKey: ["users", "me"],
        queryFn: fetchCurrentUser,
        staleTime: 5 * 60 * 1000,
    });

    if (userQuery.isPending) {
        return <div className={styles.pageStatus}>正在確認後台權限⋯</div>;
    }

    if (userQuery.isError) {
        return <div className={styles.pageStatus}>無法確認後台權限</div>;
    }

    const canManageExperiments = userQuery.data.roles.some(
        (role) => role === "EXPERIMENTER" || role === "ADMIN"
    );
    if (!canManageExperiments) {
        return (
            <div className={styles.pageStatus}>
                你沒有研究管理後台的使用權限
            </div>
        );
    }

    return children;
}
