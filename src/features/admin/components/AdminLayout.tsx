import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchCurrentUser } from "../services/adminRepository";
import AdminSidebar from "./AdminSidebar";
import AdminPageState from "./AdminPageState";
import styles from "./AdminLayout.module.css";

type Props = {
    children: ReactNode;
    onNavigate?: () => void;
};

export default function AdminLayout({ children, onNavigate }: Props) {
    const currentUserQuery = useQuery({
        queryKey: ["users", "me"],
        queryFn: fetchCurrentUser,
        staleTime: 5 * 60 * 1000,
    });

    if (currentUserQuery.isPending) {
        return <AdminPageState>載入研究管理後台中⋯</AdminPageState>;
    }
    if (currentUserQuery.isError) {
        return <AdminPageState>研究管理後台載入失敗</AdminPageState>;
    }

    return (
        <div className={styles.shell}>
            <AdminSidebar
                currentUser={currentUserQuery.data}
                onNavigate={onNavigate}
            />
            <main className={styles.main}>{children}</main>
        </div>
    );
}
