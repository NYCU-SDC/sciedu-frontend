import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    ArrowDownToLine,
    ArrowLeft,
    ArrowRight,
    BookOpen,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    FlaskConical,
    GraduationCap,
    MapPin,
    Search,
    Users,
} from "lucide-react";

import { useDocumentTitle } from "../../../shared/hooks";
import AddParticipantModal from "../components/AddParticipantModal";
import { DEMO_EXPERIMENT_ID } from "../data/demoAdminData";
import {
    fetchAdminOverview,
    listMaterialProgress,
    listParticipantProgress,
} from "../services/adminRepository";
import type { UserRole } from "../types";
import styles from "./AdminDashboardPage.module.css";

type TableView = "participants" | "materials";

const roleLabels: Record<UserRole, string> = {
    STUDENT: "學生",
    EXPERIMENTER: "實驗者",
    ADMIN: "管理員",
};

function formatDateTime(value: string) {
    const date = new Date(value);
    return new Intl.DateTimeFormat("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(date);
}

function percentage(completed: number, total: number) {
    return total === 0 ? 0 : Math.round((completed / total) * 100);
}

function Sidebar({ onOpenPeople }: { onOpenPeople: () => void }) {
    return (
        <aside className={styles.sidebar}>
            <div className={styles.sidebarBrand}>
                <GraduationCap aria-hidden="true" />
                <span>研究管理後台</span>
            </div>
            <nav className={styles.sidebarNav} aria-label="後台主選單">
                <button type="button" className={styles.navActive}>
                    <Search aria-hidden="true" />
                    總覽
                </button>
                <button type="button" disabled>
                    <FlaskConical aria-hidden="true" />
                    實驗場次（未開放）
                </button>
                <button type="button" disabled>
                    <BookOpen aria-hidden="true" />
                    教材管理（未開放）
                </button>
                <button type="button" onClick={onOpenPeople}>
                    <Users aria-hidden="true" />
                    人員管理
                </button>
                <button type="button" disabled>
                    <CheckCircle2 aria-hidden="true" />
                    作答紀錄（未開放）
                </button>
            </nav>
            <div className={styles.profile}>
                <span className={styles.avatar}>佘</span>
                <span>
                    <strong>佘曉青</strong>
                    <small>教授</small>
                </span>
            </div>
        </aside>
    );
}

export default function AdminDashboardPage() {
    useDocumentTitle("研究管理後台");

    const [tableView, setTableView] = useState<TableView>("participants");
    const [query, setQuery] = useState("");
    const [role, setRole] = useState<UserRole | "">("");
    const [materialOrder, setMaterialOrder] = useState<"asc" | "desc">("asc");
    const [page, setPage] = useState(1);
    const [isParticipantModalOpen, setParticipantModalOpen] = useState(false);

    const overviewQuery = useQuery({
        queryKey: ["admin", "experiments", DEMO_EXPERIMENT_ID, "overview"],
        queryFn: () => fetchAdminOverview(DEMO_EXPERIMENT_ID),
    });
    const participantsQuery = useQuery({
        queryKey: [
            "admin",
            "experiments",
            DEMO_EXPERIMENT_ID,
            "participants",
            { page, query, role },
        ],
        queryFn: () =>
            listParticipantProgress(DEMO_EXPERIMENT_ID, {
                page,
                pageSize: 10,
                q: query,
                role: role || undefined,
            }),
        enabled: tableView === "participants",
    });
    const materialsQuery = useQuery({
        queryKey: [
            "admin",
            "experiments",
            DEMO_EXPERIMENT_ID,
            "materials",
            { query, materialOrder },
        ],
        queryFn: () =>
            listMaterialProgress(DEMO_EXPERIMENT_ID, {
                q: query,
                order: materialOrder,
            }),
        enabled: tableView === "materials",
    });

    const overview = overviewQuery.data;
    const experimentRange = useMemo(() => {
        if (!overview) return "";
        return `${formatDateTime(overview.experiment.startAt)}－${formatDateTime(overview.experiment.endAt)}`;
    }, [overview]);

    const switchView = (nextView: TableView) => {
        setTableView(nextView);
        setQuery("");
        setRole("");
        setPage(1);
    };

    if (overviewQuery.isPending) {
        return <div className={styles.pageStatus}>載入實驗總覽中⋯</div>;
    }
    if (overviewQuery.isError || !overview) {
        return <div className={styles.pageStatus}>實驗總覽載入失敗</div>;
    }

    return (
        <div className={styles.page}>
            <Sidebar onOpenPeople={() => setParticipantModalOpen(true)} />

            <main className={styles.main}>
                <header className={styles.pageHeader}>
                    <h1>實驗總覽</h1>
                    <button
                        type="button"
                        className={styles.exportButton}
                        disabled
                        title="匯出資料功能尚未開放"
                    >
                        <ArrowDownToLine aria-hidden="true" />
                        匯出資料
                    </button>
                </header>

                <section className={styles.experimentCard}>
                    <div className={styles.experimentInfo}>
                        <div className={styles.experimentTitleRow}>
                            <h2>{overview.experiment.name}</h2>
                            <span className={styles.statusBadge}>進行中</span>
                        </div>
                        <p>{overview.experiment.description}</p>
                        <div className={styles.metadata}>
                            <span>
                                <CalendarDays aria-hidden="true" />
                                {experimentRange}
                            </span>
                            <span>
                                <MapPin aria-hidden="true" />
                                {overview.experiment.location}
                            </span>
                        </div>
                    </div>
                    <label className={styles.experimentSelect}>
                        <span>切換實驗</span>
                        <span className={styles.selectShell}>
                            <select defaultValue={overview.experiment.id}>
                                <option value={overview.experiment.id}>
                                    2026/07・{overview.experiment.name}
                                </option>
                            </select>
                            <ChevronDown aria-hidden="true" />
                        </span>
                        <small>
                            切換實驗後，統計資料與下方列表會同步更新。
                        </small>
                    </label>
                </section>

                <section className={styles.stats} aria-label="實驗統計">
                    <article>
                        <h3>參與學生</h3>
                        <strong>{overview.summary.participantCount} 人</strong>
                        <p>本場次已指派任務人數</p>
                    </article>
                    <article>
                        <h3>使用教材</h3>
                        <strong>{overview.summary.materialCount} 份</strong>
                        <p>本場次已指派教材數量</p>
                    </article>
                    <article>
                        <h3>剩餘時間</h3>
                        <strong>
                            約{" "}
                            {Math.ceil(
                                overview.summary.remainingSeconds / 86400
                            )}{" "}
                            天
                        </strong>
                        <p>{formatDateTime(overview.experiment.endAt)} 結束</p>
                    </article>
                    <article>
                        <h3>測驗模式</h3>
                        <strong>{overview.experiment.mode}</strong>
                        <p>其他細節請至「實驗場次」中查看</p>
                    </article>
                </section>

                <section className={styles.tableCard}>
                    <div className={styles.toolbar}>
                        <div className={styles.segmented}>
                            <button
                                type="button"
                                className={
                                    tableView === "participants"
                                        ? styles.segmentActive
                                        : ""
                                }
                                onClick={() => switchView("participants")}
                            >
                                按人員查看
                            </button>
                            <button
                                type="button"
                                className={
                                    tableView === "materials"
                                        ? styles.segmentActive
                                        : ""
                                }
                                onClick={() => switchView("materials")}
                            >
                                按教材查看
                            </button>
                        </div>
                        <div className={styles.tableControls}>
                            <label className={styles.searchField}>
                                <Search aria-hidden="true" />
                                <input
                                    type="search"
                                    placeholder={
                                        tableView === "participants"
                                            ? "搜尋姓名或郵件"
                                            : "搜尋教材名稱或代碼"
                                    }
                                    value={query}
                                    onChange={(event) => {
                                        setQuery(event.target.value);
                                        setPage(1);
                                    }}
                                />
                            </label>
                            {tableView === "participants" ? (
                                <label className={styles.compactSelect}>
                                    <select
                                        value={role}
                                        aria-label="篩選角色"
                                        onChange={(event) => {
                                            setRole(
                                                event.target.value as
                                                    | UserRole
                                                    | ""
                                            );
                                            setPage(1);
                                        }}
                                    >
                                        <option value="">全部角色</option>
                                        <option value="STUDENT">學生</option>
                                        <option value="EXPERIMENTER">
                                            實驗者
                                        </option>
                                        <option value="ADMIN">管理員</option>
                                    </select>
                                    <ChevronDown aria-hidden="true" />
                                </label>
                            ) : (
                                <label className={styles.compactSelect}>
                                    <select
                                        value={materialOrder}
                                        aria-label="教材完成度排序"
                                        onChange={(event) =>
                                            setMaterialOrder(
                                                event.target.value as
                                                    | "asc"
                                                    | "desc"
                                            )
                                        }
                                    >
                                        <option value="asc">
                                            依完成度低到高排列
                                        </option>
                                        <option value="desc">
                                            依完成度高到低排列
                                        </option>
                                    </select>
                                    <ChevronDown aria-hidden="true" />
                                </label>
                            )}
                        </div>
                    </div>

                    <div className={styles.tableScroll}>
                        {tableView === "participants" ? (
                            <table>
                                <thead>
                                    <tr>
                                        <th>姓名</th>
                                        <th>郵件</th>
                                        <th>角色</th>
                                        <th>教材完成度</th>
                                        <th>開始測驗時間</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {participantsQuery.data?.items.map(
                                        (person) => (
                                            <tr key={person.userId}>
                                                <td>{person.name}</td>
                                                <td>{person.email}</td>
                                                <td>
                                                    {roleLabels[person.role]}
                                                </td>
                                                <td>
                                                    {person.completedMaterials}{" "}
                                                    / {person.totalMaterials}（
                                                    {percentage(
                                                        person.completedMaterials,
                                                        person.totalMaterials
                                                    )}
                                                    %）
                                                </td>
                                                <td>
                                                    {person.startedAt
                                                        ? formatDateTime(
                                                              person.startedAt
                                                          )
                                                        : "尚未加入"}
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        ) : (
                            <table className={styles.materialTable}>
                                <thead>
                                    <tr>
                                        <th>代碼</th>
                                        <th>名稱</th>
                                        <th>學生完成度</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {materialsQuery.data?.items.map(
                                        (material) => (
                                            <tr key={material.materialId}>
                                                <td>{material.code}</td>
                                                <td>
                                                    <strong>
                                                        {material.name}
                                                    </strong>
                                                    <small>
                                                        {material.description}
                                                    </small>
                                                </td>
                                                <td>
                                                    {material.completedStudents}{" "}
                                                    / {material.totalStudents}（
                                                    {percentage(
                                                        material.completedStudents,
                                                        material.totalStudents
                                                    )}
                                                    %）
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <footer className={styles.tableFooter}>
                        <span>
                            顯示{" "}
                            {tableView === "participants"
                                ? (participantsQuery.data?.items.length ?? 0)
                                : (materialsQuery.data?.items.length ?? 0)}{" "}
                            筆資料，共{" "}
                            {tableView === "participants"
                                ? (participantsQuery.data?.totalItems ?? 0)
                                : (materialsQuery.data?.totalItems ?? 0)}{" "}
                            筆
                        </span>
                        <div className={styles.pagination}>
                            <button
                                type="button"
                                aria-label="上一頁"
                                disabled={
                                    tableView === "materials" || page <= 1
                                }
                                onClick={() =>
                                    setPage((current) => current - 1)
                                }
                            >
                                <ArrowLeft aria-hidden="true" />
                            </button>
                            <span>
                                {tableView === "participants"
                                    ? (participantsQuery.data?.currentPage ?? 1)
                                    : 1}{" "}
                                /{" "}
                                {tableView === "participants"
                                    ? (participantsQuery.data?.totalPages ?? 1)
                                    : 1}
                            </span>
                            <button
                                type="button"
                                aria-label="下一頁"
                                disabled={
                                    tableView === "materials" ||
                                    !participantsQuery.data?.hasNextPage
                                }
                                onClick={() =>
                                    setPage((current) => current + 1)
                                }
                            >
                                <ArrowRight aria-hidden="true" />
                            </button>
                        </div>
                    </footer>
                </section>
            </main>

            {isParticipantModalOpen && (
                <AddParticipantModal
                    experimentId={DEMO_EXPERIMENT_ID}
                    onClose={() => setParticipantModalOpen(false)}
                />
            )}
        </div>
    );
}
