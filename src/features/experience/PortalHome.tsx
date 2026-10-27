import {
    BookOpen,
    FlaskConical,
    MessageCircle,
    ArrowUpRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { useAuth } from "../../shared/auth";
import { fetchCurrentUser } from "../admin/services/adminRepository";
import { useDocumentTitle } from "../../shared/hooks";
import styles from "./PortalHome.module.css";
export default function PortalHome() {
    useDocumentTitle("首頁");
    const { session, logout } = useAuth();
    const user = useQuery({
        queryKey: ["users", "me"],
        queryFn: fetchCurrentUser,
        staleTime: 300000,
    });
    const mode = import.meta.env.VITE_APP_MODE;
    const courses = mode === "edu" || mode === "dev";
    const chat = mode === "llm" || mode === "dev";
    const admin =
        courses &&
        user.data?.roles.some((r) => r === "ADMIN" || r === "EXPERIMENTER");
    const links = [
        ...(courses
            ? [
                  {
                      to: "/courses",
                      title: "教材",
                      description: "進入目前實驗，閱讀教材與操作互動模擬。",
                      Icon: BookOpen,
                  },
              ]
            : []),
        ...(admin
            ? [
                  {
                      to: "/admin",
                      title: "實驗管理",
                      description: "安排實驗、教材與參與人員。",
                      Icon: FlaskConical,
                  },
              ]
            : []),
        ...(chat
            ? [
                  {
                      to: "/chat",
                      title: "AI 聊天",
                      description: "開始新的對話，或接續先前的討論。",
                      Icon: MessageCircle,
                  },
              ]
            : []),
    ];
    return (
        <main className={styles.root}>
            <header className={styles.header}>
                <strong>SciEdu</strong>
                <button onClick={() => void logout()}>登出</button>
            </header>
            <section className={styles.welcome}>
                <span>科學學習平台</span>
                <h1>
                    歡迎回來{session?.username ? `，${session.username}` : ""}
                </h1>
                <p>從這裡開始今天的學習與探索。</p>
            </section>
            <nav className={styles.cards} aria-label="平台入口">
                {links.map(({ to, title, description, Icon }) => (
                    <Link key={to} to={to} className={styles.card}>
                        <Icon size={30} aria-hidden="true" />
                        <h2>{title}</h2>
                        <p>{description}</p>
                        <span>
                            進入 <ArrowUpRight size={18} aria-hidden="true" />
                        </span>
                    </Link>
                ))}
            </nav>
            {user.isError && (
                <p role="alert">
                    暫時無法確認管理權限。
                    <button onClick={() => void user.refetch()}>重試</button>
                </p>
            )}
        </main>
    );
}
