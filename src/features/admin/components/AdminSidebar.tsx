import { Avatar, UnstyledButton } from "@mantine/core";
import {
    BookOpen,
    CheckCircle2,
    FlaskConical,
    GraduationCap,
    Search,
    Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router";

import { roleLabels } from "../formatters";
import type { User } from "../types";
import styles from "./AdminSidebar.module.css";

export type AdminSection = "overview" | "experiments" | "people";

type Props = {
    currentUser: User;
    onNavigate?: () => void;
};

type NavigationItem = {
    label: string;
    icon: LucideIcon;
    section?: AdminSection;
    path?: string;
};

const navigationItems: NavigationItem[] = [
    { label: "總覽", icon: Search, section: "overview", path: "/admin" },
    {
        label: "實驗管理",
        icon: FlaskConical,
        section: "experiments",
        path: "/admin/experiments",
    },
    { label: "教材管理（未開放）", icon: BookOpen },
    {
        label: "人員管理",
        icon: Users,
        section: "people",
        path: "/admin?section=people",
    },
    { label: "作答紀錄（未開放）", icon: CheckCircle2 },
];

function getActiveSection(pathname: string, search: string): AdminSection {
    if (pathname.startsWith("/admin/experiments")) return "experiments";
    if (new URLSearchParams(search).get("section") === "people") {
        return "people";
    }
    return "overview";
}

export default function AdminSidebar({ currentUser, onNavigate }: Props) {
    const navigate = useNavigate();
    const location = useLocation();
    const activeSection = getActiveSection(location.pathname, location.search);

    const navigateTo = (path: string) => {
        onNavigate?.();
        navigate(path);
    };

    return (
        <aside className={styles.sidebar}>
            <div className={styles.sidebarBrand}>
                <GraduationCap aria-hidden="true" />
                <span>研究管理後台</span>
            </div>
            <nav className={styles.sidebarNav} aria-label="後台主選單">
                {navigationItems.map((item) => {
                    const isActive = item.section === activeSection;
                    const Icon = item.icon;
                    const path = item.path;
                    return (
                        <UnstyledButton
                            key={item.label}
                            className={isActive ? styles.navActive : ""}
                            aria-current={isActive ? "page" : undefined}
                            disabled={!path}
                            onClick={path ? () => navigateTo(path) : undefined}
                        >
                            <Icon aria-hidden="true" />
                            {item.label}
                        </UnstyledButton>
                    );
                })}
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
