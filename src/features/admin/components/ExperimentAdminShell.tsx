import type { ReactNode } from "react";
import { Avatar, UnstyledButton } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import {
    BookOpen,
    CheckCircle2,
    FlaskConical,
    GraduationCap,
    Search,
    Users,
} from "lucide-react";
import { useNavigate } from "react-router";

import { roleLabels } from "../formatters";
import { fetchCurrentUser } from "../services/adminRepository";
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
        <div className={styles.shell}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>
                    <GraduationCap aria-hidden="true" />
                    <span>研究管理後台</span>
                </div>
                <nav className={styles.nav} aria-label="研究管理後台主選單">
                    <UnstyledButton
                        className={
                            activeSection === "overview"
                                ? styles.navActive
                                : undefined
                        }
                        onClick={() => navigate("/admin")}
                    >
                        <Search aria-hidden="true" />
                        總覽
                    </UnstyledButton>
                    <UnstyledButton
                        className={
                            activeSection === "experiments"
                                ? styles.navActive
                                : undefined
                        }
                        onClick={() => navigate("/admin/experiments")}
                    >
                        <FlaskConical aria-hidden="true" />
                        實驗管理
                    </UnstyledButton>
                    <UnstyledButton disabled>
                        <BookOpen aria-hidden="true" />
                        教材管理（未開放）
                    </UnstyledButton>
                    <UnstyledButton
                        className={
                            activeSection === "people"
                                ? styles.navActive
                                : undefined
                        }
                        onClick={() => navigate("/admin?section=people")}
                    >
                        <Users aria-hidden="true" />
                        人員管理
                    </UnstyledButton>
                    <UnstyledButton disabled>
                        <CheckCircle2 aria-hidden="true" />
                        作答紀錄（未開放）
                    </UnstyledButton>
                </nav>
                <div className={styles.profile}>
                    <Avatar color="brandTeal" size={52}>
                        {currentUser.name.trim().slice(0, 1)}
                    </Avatar>
                    <span>
                        <strong>{currentUser.name}</strong>
                        <small>
                            {currentUser.roles
                                .map((role) => roleLabels[role])
                                .join("、")}
                        </small>
                    </span>
                </div>
            </aside>
            <main className={styles.main}>{children}</main>
        </div>
    );
}
