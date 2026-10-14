import { AuthContext } from "../../../shared/auth/AuthContext";
import { useState } from "react";
import { Link, Outlet } from "react-router";
import CourseChat from "../../courses/genetics/components/CourseChat";
import { useCourseChatController } from "../../courses/genetics/components/useCourseChatController";
import styles from "./ChatPreview.module.css";
export function CourseChatPreview() {
    const controller = useCourseChatController();
    return (
        <div className={styles.course}>
            <section className={styles.material}>
                <h1>基因與性狀</h1>
                <p>教材聊天面板預覽</p>
                <p>
                    為什麼子代的性狀不一定與雙親完全相同？試著與科學老師及學習夥伴討論。
                </p>
            </section>
            <aside className={styles.panel}>
                <CourseChat controller={controller} />
            </aside>
        </div>
    );
}
export default function ChatPreview() {
    const [help, setHelp] = useState(false);
    return (
        <AuthContext.Provider
            value={{
                session: null,
                isAuthenticated: false,
                isLoading: false,
                login: () => undefined,
                logout: async () => undefined,
                refresh: () => undefined,
            }}
        >
            <div className={styles.root}>
                <nav className={styles.toolbar}>
                    <strong>Chat 模擬預覽</strong>
                    <Link to="/chat-preview/">獨立聊天</Link>
                    <Link to="/chat-preview/course">教材面板</Link>
                    <button onClick={() => setHelp(!help)}>測試情境</button>
                </nav>
                {help && (
                    <p className={styles.help}>
                        任意提問：多角色回覆。輸入
                        [disconnect]：首次斷線，可重新載入。輸入
                        [error]：串流失敗。模擬紀錄保存在此分頁，重新整理後仍可查閱。
                    </p>
                )}
                <div className={styles.content}>
                    <Outlet />
                </div>
            </div>
        </AuthContext.Provider>
    );
}
