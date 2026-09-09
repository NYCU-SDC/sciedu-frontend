import { Avatar, UnstyledButton } from "@mantine/core";
import {
    BookOpen,
    CheckCircle2,
    FlaskConical,
    GraduationCap,
    Search,
    Users,
} from "lucide-react";
import { roleLabels } from "../formatters";
import type { User } from "../types";
import styles from "../pages/AdminDashboardPage.module.css";

export type AdminSection = "overview" | "experiments" | "people" | "answers";

type Props = {
    currentUser: User;
    activeSection: AdminSection;
    onNavigate: (section: AdminSection) => void;
};

export default function AdminSidebar({
    currentUser,
    activeSection,
    onNavigate,
}: Props) {
    return (
        <aside className={styles.sidebar}>
            <div className={styles.sidebarBrand}>
                <GraduationCap aria-hidden="true" />
                <span>研究管理後台</span>
            </div>
            <nav className={styles.sidebarNav} aria-label="後台主選單">
                <UnstyledButton
                    className={
                        activeSection === "overview" ? styles.navActive : ""
                    }
                    onClick={() => onNavigate("overview")}
                >
                    <Search aria-hidden="true" />
                    總覽
                </UnstyledButton>
                <UnstyledButton
                    className={
                        activeSection === "experiments" ? styles.navActive : ""
                    }
                    onClick={() => onNavigate("experiments")}
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
                        activeSection === "people" ? styles.navActive : ""
                    }
                    onClick={() => onNavigate("people")}
                >
                    <Users aria-hidden="true" />
                    人員管理
                </UnstyledButton>
                <UnstyledButton
                    className={
                        activeSection === "answers" ? styles.navActive : ""
                    }
                    onClick={() => onNavigate("answers")}
                >
                    <CheckCircle2 aria-hidden="true" />
                    作答紀錄
                </UnstyledButton>
            </nav>
            <div className={styles.profile}>
                <Avatar className={styles.avatar} color="brandTeal">
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
    );
}
