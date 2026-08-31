import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
    MoreVertical,
    Plus,
    Search,
    Trash2,
    Users,
} from "lucide-react";
import { toast } from "sonner";

import { useDocumentTitle } from "../../../shared/hooks";
import AddParticipantModal from "../components/AddParticipantModal";
import {
    fetchCurrentUser,
    fetchExperiment,
    listExperimentCourses,
    listExperimentParticipants,
    listExperiments,
    removeExperimentParticipant,
} from "../services/adminRepository";
import type {
    CourseStatus,
    ExperimentStatus,
    GradingMode,
    User,
    UserRole,
} from "../types";
import styles from "./AdminDashboardPage.module.css";

type TableView = "participants" | "courses";
type AdminSection = "overview" | "people";

const PAGE_SIZE = 10;

const roleLabels: Record<UserRole, string> = {
    STUDENT: "學生",
    EXPERIMENTER: "實驗者",
    ADMIN: "管理員",
};

const experimentStatusLabels: Record<ExperimentStatus, string> = {
    DRAFT: "草稿",
    SCHEDULED: "已排程",
    ACTIVE: "進行中",
    COMPLETED: "已完成",
    ARCHIVED: "已封存",
};

const gradingModeLabels: Record<GradingMode, string> = {
    AUTOMATIC: "自動評分",
    MANUAL: "人工評分",
};

const courseStatusLabels: Record<CourseStatus, string> = {
    DRAFT: "草稿",
    PUBLISHED: "已發布",
    ARCHIVED: "已封存",
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

function Sidebar({
    currentUser,
    activeSection,
    onNavigate,
}: {
    currentUser: User;
    activeSection: AdminSection;
    onNavigate: (section: AdminSection) => void;
}) {
    return (
        <aside className={styles.sidebar}>
            <div className={styles.sidebarBrand}>
                <GraduationCap aria-hidden="true" />
                <span>研究管理後台</span>
            </div>
            <nav className={styles.sidebarNav} aria-label="後台主選單">
                <button
                    type="button"
                    className={
                        activeSection === "overview" ? styles.navActive : ""
                    }
                    onClick={() => onNavigate("overview")}
                >
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
                <button
                    type="button"
                    className={
                        activeSection === "people" ? styles.navActive : ""
                    }
                    onClick={() => onNavigate("people")}
                >
                    <Users aria-hidden="true" />
                    人員管理
                </button>
                <button type="button" disabled>
                    <CheckCircle2 aria-hidden="true" />
                    作答紀錄（未開放）
                </button>
            </nav>
            <div className={styles.profile}>
                <span className={styles.avatar}>
                    {currentUser.name.trim().slice(0, 1)}
                </span>
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

export default function AdminDashboardPage() {
    useDocumentTitle("研究管理後台");
    const queryClient = useQueryClient();

    const [activeSection, setActiveSection] =
        useState<AdminSection>("overview");
    const [selectedExperimentId, setSelectedExperimentId] = useState("");
    const [tableView, setTableView] = useState<TableView>("participants");
    const [query, setQuery] = useState("");
    const [role, setRole] = useState<UserRole | "">("");
    const [courseOrder, setCourseOrder] = useState<"asc" | "desc">("asc");
    const [page, setPage] = useState(1);
    const [isParticipantModalOpen, setParticipantModalOpen] = useState(false);
    const [openParticipantMenuId, setOpenParticipantMenuId] = useState("");
    const [loadedAt] = useState(() => Date.now());

    const currentUserQuery = useQuery({
        queryKey: ["users", "me"],
        queryFn: fetchCurrentUser,
        staleTime: 5 * 60 * 1000,
    });
    const experimentsQuery = useQuery({
        queryKey: ["admin", "experiments", "list"],
        queryFn: () => listExperiments({ page: 1, pageSize: 100 }),
    });

    const experiments = experimentsQuery.data?.items ?? [];
    const activeExperimentId = experiments.some(
        (experiment) => experiment.id === selectedExperimentId
    )
        ? selectedExperimentId
        : (experiments[0]?.id ?? "");

    const experimentQuery = useQuery({
        queryKey: ["admin", "experiments", activeExperimentId, "detail"],
        queryFn: () => fetchExperiment(activeExperimentId),
        enabled: Boolean(activeExperimentId),
    });
    const participantsQuery = useQuery({
        queryKey: ["admin", "experiments", activeExperimentId, "participants"],
        queryFn: () => listExperimentParticipants(activeExperimentId),
        enabled: Boolean(activeExperimentId),
    });
    const coursesQuery = useQuery({
        queryKey: ["admin", "experiments", activeExperimentId, "courses"],
        queryFn: () => listExperimentCourses(activeExperimentId),
        enabled: Boolean(activeExperimentId),
    });

    const removeParticipantMutation = useMutation({
        mutationFn: (userId: string) =>
            removeExperimentParticipant(activeExperimentId, userId),
        onSuccess: async () => {
            setOpenParticipantMenuId("");
            await queryClient.invalidateQueries({
                queryKey: ["admin", "experiments", activeExperimentId],
            });
            toast.success("已從本場實驗移除參與者");
        },
        onError: () => toast.error("移除參與者失敗，請稍後再試"),
    });

    const filteredParticipants = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase("zh-Hant");
        return (participantsQuery.data ?? []).filter(({ participant }) => {
            const matchesQuery =
                !normalizedQuery ||
                participant.name
                    .toLocaleLowerCase("zh-Hant")
                    .includes(normalizedQuery) ||
                participant.email.toLocaleLowerCase().includes(normalizedQuery);
            const matchesRole = !role || participant.roles.includes(role);
            return matchesQuery && matchesRole;
        });
    }, [participantsQuery.data, query, role]);

    const filteredCourses = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase("zh-Hant");
        return (coursesQuery.data ?? [])
            .filter(
                ({ course }) =>
                    !normalizedQuery ||
                    course.title
                        .toLocaleLowerCase("zh-Hant")
                        .includes(normalizedQuery) ||
                    course.code.toLocaleLowerCase().includes(normalizedQuery)
            )
            .sort(({ course: a }, { course: b }) => {
                const direction = courseOrder === "asc" ? 1 : -1;
                return a.code.localeCompare(b.code, "zh-Hant") * direction;
            });
    }, [courseOrder, coursesQuery.data, query]);

    const displayView: TableView =
        activeSection === "people" ? "participants" : tableView;
    const activeItems =
        displayView === "participants" ? filteredParticipants : filteredCourses;
    const totalPages = Math.max(1, Math.ceil(activeItems.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const visibleParticipants = filteredParticipants.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );
    const visibleCourses = filteredCourses.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    const switchView = (nextView: TableView) => {
        setTableView(nextView);
        setQuery("");
        setRole("");
        setPage(1);
    };

    const switchExperiment = (experimentId: string) => {
        setSelectedExperimentId(experimentId);
        setQuery("");
        setRole("");
        setPage(1);
        setOpenParticipantMenuId("");
    };

    if (currentUserQuery.isPending || experimentsQuery.isPending) {
        return <div className={styles.pageStatus}>載入實驗總覽中⋯</div>;
    }
    if (currentUserQuery.isError || experimentsQuery.isError) {
        return <div className={styles.pageStatus}>實驗總覽載入失敗</div>;
    }
    if (experimentsQuery.data.items.length === 0) {
        return <div className={styles.pageStatus}>目前沒有可管理的實驗</div>;
    }
    if (experimentQuery.isError) {
        return <div className={styles.pageStatus}>實驗資料載入失敗</div>;
    }
    if (experimentQuery.isPending || !experimentQuery.data) {
        return <div className={styles.pageStatus}>載入實驗資料中⋯</div>;
    }

    const experiment = experimentQuery.data;
    const experimentRange =
        formatDateTime(experiment.scheduledStartAt) +
        "－" +
        formatDateTime(experiment.scheduledEndAt);
    const remainingDays = Math.max(
        0,
        Math.ceil(
            (new Date(experiment.scheduledEndAt).getTime() - loadedAt) /
                86_400_000
        )
    );
    const activeQuery =
        displayView === "participants" ? participantsQuery : coursesQuery;

    return (
        <div className={styles.page}>
            <Sidebar
                currentUser={currentUserQuery.data}
                activeSection={activeSection}
                onNavigate={(section) => {
                    setActiveSection(section);
                    setQuery("");
                    setRole("");
                    setPage(1);
                    setOpenParticipantMenuId("");
                }}
            />

            <main className={styles.main}>
                <header className={styles.pageHeader}>
                    <h1>
                        {activeSection === "overview" ? "實驗總覽" : "人員管理"}
                    </h1>
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
                            <h2>{experiment.name}</h2>
                            <span className={styles.statusBadge}>
                                {experimentStatusLabels[experiment.status]}
                            </span>
                        </div>
                        <p>{experiment.description || "尚未提供實驗說明"}</p>
                        <div className={styles.metadata}>
                            <span>
                                <CalendarDays aria-hidden="true" />
                                {experimentRange}
                            </span>
                        </div>
                    </div>
                    <label className={styles.experimentSelect}>
                        <span>切換實驗</span>
                        <span className={styles.selectShell}>
                            <select
                                value={activeExperimentId}
                                onChange={(event) =>
                                    switchExperiment(event.target.value)
                                }
                            >
                                {experimentsQuery.data.items.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {formatDateTime(
                                            item.scheduledStartAt
                                        ).slice(0, 7)}
                                        ・{item.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown aria-hidden="true" />
                        </span>
                        <small>
                            切換實驗後，統計資料與下方列表會同步更新。
                        </small>
                    </label>
                </section>

                {activeSection === "overview" && (
                    <section className={styles.stats} aria-label="實驗統計">
                        <article>
                            <h3>參與人員</h3>
                            <strong>{experiment.participantCount} 人</strong>
                            <p>本場次目前指派人數</p>
                        </article>
                        <article>
                            <h3>使用教材</h3>
                            <strong>{experiment.courseCount} 份</strong>
                            <p>本場次目前指派教材數量</p>
                        </article>
                        <article>
                            <h3>剩餘時間</h3>
                            <strong>
                                {remainingDays > 0
                                    ? "約 " + remainingDays + " 天"
                                    : "已結束"}
                            </strong>
                            <p>
                                {formatDateTime(experiment.scheduledEndAt)} 結束
                            </p>
                        </article>
                        <article>
                            <h3>評分模式</h3>
                            <strong>
                                {
                                    gradingModeLabels[
                                        experiment.configuration.gradingMode
                                    ]
                                }
                            </strong>
                            <p>依本場實驗設定顯示</p>
                        </article>
                    </section>
                )}

                <section
                    className={`${styles.tableCard} ${
                        activeSection === "people" ? styles.peopleTableCard : ""
                    }`}
                >
                    <div
                        className={`${styles.toolbar} ${
                            activeSection === "people"
                                ? styles.peopleToolbar
                                : ""
                        }`}
                    >
                        {activeSection === "overview" ? (
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
                                        tableView === "courses"
                                            ? styles.segmentActive
                                            : ""
                                    }
                                    onClick={() => switchView("courses")}
                                >
                                    按教材查看
                                </button>
                            </div>
                        ) : (
                            <h2 className={styles.tableTitle}>
                                本場次實驗參與者
                            </h2>
                        )}
                        <div className={styles.tableControls}>
                            <label className={styles.searchField}>
                                <Search aria-hidden="true" />
                                <input
                                    type="search"
                                    placeholder={
                                        displayView === "participants"
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
                            {displayView === "participants" ? (
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
                                        value={courseOrder}
                                        aria-label="教材代碼排序"
                                        onChange={(event) => {
                                            setCourseOrder(
                                                event.target.value as
                                                    | "asc"
                                                    | "desc"
                                            );
                                            setPage(1);
                                        }}
                                    >
                                        <option value="asc">
                                            教材代碼 A 到 Z
                                        </option>
                                        <option value="desc">
                                            教材代碼 Z 到 A
                                        </option>
                                    </select>
                                    <ChevronDown aria-hidden="true" />
                                </label>
                            )}
                            {activeSection === "people" && (
                                <button
                                    type="button"
                                    className={styles.addButton}
                                    onClick={() =>
                                        setParticipantModalOpen(true)
                                    }
                                >
                                    <Plus aria-hidden="true" />
                                    加入人員
                                </button>
                            )}
                        </div>
                    </div>

                    {activeQuery.isPending ? (
                        <p className={styles.emptyState}>載入列表中⋯</p>
                    ) : activeQuery.isError ? (
                        <p className={styles.emptyState}>列表載入失敗</p>
                    ) : (
                        <div className={styles.tableScroll}>
                            {displayView === "participants" ? (
                                <table
                                    className={`${styles.participantTable} ${
                                        activeSection === "people"
                                            ? styles.peopleTable
                                            : ""
                                    }`}
                                >
                                    <thead>
                                        <tr>
                                            <th>姓名</th>
                                            <th>郵件</th>
                                            <th>角色</th>
                                            <th>加入實驗時間</th>
                                            {activeSection === "people" && (
                                                <>
                                                    <th>帳號建立時間</th>
                                                    <th aria-label="操作" />
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibleParticipants.map(
                                            ({ participant, assignedAt }) => (
                                                <tr key={participant.id}>
                                                    <td>{participant.name}</td>
                                                    <td>{participant.email}</td>
                                                    <td>
                                                        {participant.roles
                                                            .map(
                                                                (
                                                                    participantRole
                                                                ) =>
                                                                    roleLabels[
                                                                        participantRole
                                                                    ]
                                                            )
                                                            .join("、")}
                                                    </td>
                                                    <td>
                                                        {formatDateTime(
                                                            assignedAt
                                                        )}
                                                    </td>
                                                    {activeSection ===
                                                        "people" && (
                                                        <>
                                                            <td>
                                                                {formatDateTime(
                                                                    participant.createdAt
                                                                )}
                                                            </td>
                                                            <td>
                                                                <div
                                                                    className={
                                                                        styles.rowActions
                                                                    }
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        className={
                                                                            styles.rowMenuButton
                                                                        }
                                                                        aria-label={`開啟 ${participant.name} 的操作選單`}
                                                                        aria-expanded={
                                                                            openParticipantMenuId ===
                                                                            participant.id
                                                                        }
                                                                        onClick={() =>
                                                                            setOpenParticipantMenuId(
                                                                                (
                                                                                    current
                                                                                ) =>
                                                                                    current ===
                                                                                    participant.id
                                                                                        ? ""
                                                                                        : participant.id
                                                                            )
                                                                        }
                                                                    >
                                                                        <MoreVertical aria-hidden="true" />
                                                                    </button>
                                                                    {openParticipantMenuId ===
                                                                        participant.id && (
                                                                        <div
                                                                            className={
                                                                                styles.rowMenu
                                                                            }
                                                                            role="menu"
                                                                        >
                                                                            <button
                                                                                type="button"
                                                                                role="menuitem"
                                                                                disabled={
                                                                                    removeParticipantMutation.isPending
                                                                                }
                                                                                onClick={() => {
                                                                                    if (
                                                                                        window.confirm(
                                                                                            `確定要將 ${participant.name} 從本場實驗移除嗎？`
                                                                                        )
                                                                                    ) {
                                                                                        removeParticipantMutation.mutate(
                                                                                            participant.id
                                                                                        );
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <Trash2 aria-hidden="true" />
                                                                                刪除
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </>
                                                    )}
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
                                            <th>狀態</th>
                                            <th>加入實驗時間</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibleCourses.map(
                                            ({ course, linkedAt }) => (
                                                <tr key={course.id}>
                                                    <td>{course.code}</td>
                                                    <td>
                                                        <strong>
                                                            {course.title}
                                                        </strong>
                                                        <small>
                                                            {course.description}
                                                        </small>
                                                    </td>
                                                    <td>
                                                        {
                                                            courseStatusLabels[
                                                                course.status
                                                            ]
                                                        }
                                                    </td>
                                                    <td>
                                                        {formatDateTime(
                                                            linkedAt
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    <footer className={styles.tableFooter}>
                        <span>
                            顯示{" "}
                            {displayView === "participants"
                                ? visibleParticipants.length
                                : visibleCourses.length}{" "}
                            筆資料，共 {activeItems.length} 筆
                        </span>
                        <div className={styles.pagination}>
                            <button
                                type="button"
                                aria-label="上一頁"
                                disabled={currentPage <= 1}
                                onClick={() =>
                                    setPage((current) => current - 1)
                                }
                            >
                                <ArrowLeft aria-hidden="true" />
                            </button>
                            <span>
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                type="button"
                                aria-label="下一頁"
                                disabled={currentPage >= totalPages}
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
                    experimentId={activeExperimentId}
                    onClose={() => setParticipantModalOpen(false)}
                />
            )}
        </div>
    );
}
