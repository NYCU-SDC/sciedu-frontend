import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";

import { fetchCurrentUser } from "../services/adminRepository";
import AdminSidebar from "./AdminSidebar";
import dashboardStyles from "../pages/AdminDashboardPage.module.css";
import styles from "../pages/ExperimentAdmin.module.css";

type Section = "overview" | "experiments" | "people";

export default function ExperimentAdminShell({
    activeSection,
    children,
}: {
    activeSection: Section;
    children: ReactNode;
}) {
    const navigate = useNavigate();
    const currentUserQuery = useQuery({
        queryKey: ["users", "me"],
        queryFn: fetchCurrentUser,
        staleTime: 5 * 60 * 1000,
    });

    if (currentUserQuery.isPending) {
        return <div className={styles.pageStatus}>載入研究管理後台中⋯</div>;
    }
    if (currentUserQuery.isError) {
        return <div className={styles.pageStatus}>研究管理後台載入失敗</div>;
    }

    const currentUser = currentUserQuery.data;
    return (
        <div className={dashboardStyles.page}>
            <AdminSidebar
                currentUser={currentUser}
                activeSection={activeSection}
                onNavigate={(section) => {
                    if (section === "experiments") {
                        navigate("/admin/experiments");
                    } else {
                        navigate(`/admin?section=${section}`);
                    }
                }}
            />
            <main className={dashboardStyles.main}>{children}</main>
        </div>
    );
}
