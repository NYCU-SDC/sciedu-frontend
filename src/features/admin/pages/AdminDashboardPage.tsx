import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    ActionIcon,
    Button,
    Card,
    SegmentedControl,
    Select,
    Text,
    TextInput,
    Title,
} from "@mantine/core";
import {
    ArrowDownToLine,
    ArrowLeft,
    ArrowRight,
    Plus,
    Search,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router";

import { useDocumentTitle } from "../../../shared/hooks";
import AddParticipantModal from "../components/AddParticipantModal";
import AdminSidebar, { type AdminSection } from "../components/AdminSidebar";
import CourseTable from "../components/CourseTable";
import ExperimentStats from "../components/ExperimentStats";
import ExperimentSummary from "../components/ExperimentSummary";
import ParticipantTable from "../components/ParticipantTable";
import {
    fetchCurrentUser,
    fetchExperiment,
    listAllExperiments,
    listExperimentCourses,
    listExperimentParticipants,
    removeExperimentParticipant,
} from "../services/adminRepository";
import type { UserRole } from "../types";
import styles from "./AdminDashboardPage.module.css";

type TableView = "participants" | "courses";

const PAGE_SIZE = 10;

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
    const [loadedAt] = useState(() => Date.now());

    const currentUserQuery = useQuery({
        queryKey: ["users", "me"],
        queryFn: fetchCurrentUser,
        staleTime: 5 * 60 * 1000,
    });
    const experimentsQuery = useQuery({
        queryKey: ["admin", "experiments", "list"],
        queryFn: listAllExperiments,
    });

    const experiments = experimentsQuery.data ?? [];
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

    const resetTable = () => {
        setQuery("");
        setRole("");
        setPage(1);
    };

    const switchView = (nextView: TableView) => {
        setTableView(nextView);
        resetTable();
    };

    const switchExperiment = (experimentId: string) => {
        setSelectedExperimentId(experimentId);
        resetTable();
    };

    const switchSection = (section: AdminSection) => {
        setActiveSection(section);
        resetTable();
    };

    if (currentUserQuery.isPending || experimentsQuery.isPending) {
        return <div className={styles.pageStatus}>載入實驗總覽中⋯</div>;
    }
    if (currentUserQuery.isError || experimentsQuery.isError) {
        return <div className={styles.pageStatus}>實驗總覽載入失敗</div>;
    }
    if (experiments.length === 0) {
        return <div className={styles.pageStatus}>目前沒有可管理的實驗</div>;
    }
    if (experimentQuery.isError) {
        return <div className={styles.pageStatus}>實驗資料載入失敗</div>;
    }
    if (experimentQuery.isPending || !experimentQuery.data) {
        return <div className={styles.pageStatus}>載入實驗資料中⋯</div>;
    }

    const experiment = experimentQuery.data;
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
            <AdminSidebar
                currentUser={currentUserQuery.data}
                activeSection={activeSection}
                onNavigate={switchSection}
            />

            <main className={styles.main}>
                <header className={styles.pageHeader}>
                    <Title order={1}>
                        {activeSection === "overview" ? "實驗總覽" : "人員管理"}
                    </Title>
                    <Button
                        className={styles.exportButton}
                        classNames={{
                            label: styles.exportButtonLabel,
                            section: styles.exportButtonSection,
                        }}
                        disabled
                        title="匯出資料功能尚未開放"
                        variant="default"
                        radius="md"
                        leftSection={<ArrowDownToLine aria-hidden="true" />}
                    >
                        匯出資料
                    </Button>
                </header>

                <ExperimentSummary
                    experiment={experiment}
                    experiments={experiments}
                    activeExperimentId={activeExperimentId}
                    onExperimentChange={switchExperiment}
                />

                {activeSection === "overview" && (
                    <ExperimentStats
                        experiment={experiment}
                        remainingDays={remainingDays}
                    />
                )}

                <Card
                    component="section"
                    radius="lg"
                    withBorder
                    className={styles.tableCard}
                >
                    <div
                        className={`${styles.toolbar} ${
                            activeSection === "people"
                                ? styles.peopleToolbar
                                : ""
                        }`}
                    >
                        {activeSection === "overview" ? (
                            <SegmentedControl
                                className={styles.segmented}
                                classNames={{
                                    indicator: styles.segmentedIndicator,
                                    label: styles.segmentedLabel,
                                }}
                                value={tableView}
                                data={[
                                    {
                                        label: "按人員查看",
                                        value: "participants",
                                    },
                                    { label: "按教材查看", value: "courses" },
                                ]}
                                onChange={(value) =>
                                    switchView(value as TableView)
                                }
                                radius="md"
                            />
                        ) : (
                            <Text c="dimmed" size="sm">
                                本場次實驗參與者
                            </Text>
                        )}
                        <div className={styles.tableControls}>
                            <TextInput
                                className={styles.searchField}
                                classNames={{ input: styles.mantineTextInput }}
                                type="search"
                                placeholder={
                                    displayView === "participants"
                                        ? "搜尋姓名或郵件"
                                        : "搜尋教材名稱或代碼"
                                }
                                aria-label="搜尋表格資料"
                                value={query}
                                onChange={(event) => {
                                    setQuery(event.currentTarget.value);
                                    setPage(1);
                                }}
                                leftSection={
                                    <Search size={16} aria-hidden="true" />
                                }
                                radius="md"
                            />
                            {displayView === "participants" ? (
                                <Select
                                    className={styles.compactSelect}
                                    value={role}
                                    allowDeselect={false}
                                    aria-label="篩選角色"
                                    data={[
                                        { value: "", label: "全部角色" },
                                        { value: "STUDENT", label: "學生" },
                                        {
                                            value: "EXPERIMENTER",
                                            label: "實驗者",
                                        },
                                        { value: "ADMIN", label: "管理員" },
                                    ]}
                                    onChange={(value) => {
                                        setRole((value ?? "") as UserRole | "");
                                        setPage(1);
                                    }}
                                    radius="md"
                                    classNames={{
                                        input: styles.mantineSelectInput,
                                        dropdown: styles.mantineSelectDropdown,
                                        option: styles.mantineSelectOption,
                                    }}
                                />
                            ) : (
                                <Select
                                    className={styles.compactSelect}
                                    value={courseOrder}
                                    allowDeselect={false}
                                    aria-label="教材代碼排序"
                                    data={[
                                        {
                                            value: "asc",
                                            label: "教材代碼 A 到 Z",
                                        },
                                        {
                                            value: "desc",
                                            label: "教材代碼 Z 到 A",
                                        },
                                    ]}
                                    onChange={(value) => {
                                        setCourseOrder(
                                            (value ?? "asc") as "asc" | "desc"
                                        );
                                        setPage(1);
                                    }}
                                    radius="md"
                                    classNames={{
                                        input: styles.mantineSelectInput,
                                        dropdown: styles.mantineSelectDropdown,
                                        option: styles.mantineSelectOption,
                                    }}
                                />
                            )}
                            {activeSection === "people" && (
                                <Button
                                    className={styles.addButton}
                                    leftSection={
                                        <Plus size={16} aria-hidden="true" />
                                    }
                                    color="brandTeal"
                                    onClick={() =>
                                        setParticipantModalOpen(true)
                                    }
                                >
                                    加入人員
                                </Button>
                            )}
                        </div>
                    </div>

                    {activeQuery.isPending ? (
                        <Text
                            c="dimmed"
                            ta="center"
                            my="xl"
                            className={styles.emptyState}
                        >
                            載入列表中⋯
                        </Text>
                    ) : activeQuery.isError ? (
                        <Text
                            c="dimmed"
                            ta="center"
                            my="xl"
                            className={styles.emptyState}
                        >
                            列表載入失敗
                        </Text>
                    ) : (
                        <div className={styles.tableScroll}>
                            {displayView === "participants" ? (
                                <ParticipantTable
                                    participants={visibleParticipants}
                                    showAccountCreatedAt={
                                        activeSection === "people"
                                    }
                                    isRemoving={
                                        removeParticipantMutation.isPending
                                    }
                                    onRemove={(
                                        participantId,
                                        participantName
                                    ) => {
                                        if (
                                            window.confirm(
                                                `確定要將 ${participantName} 從本場實驗移除嗎？`
                                            )
                                        ) {
                                            removeParticipantMutation.mutate(
                                                participantId
                                            );
                                        }
                                    }}
                                />
                            ) : (
                                <CourseTable courses={visibleCourses} />
                            )}
                        </div>
                    )}

                    <footer className={styles.tableFooter}>
                        <Text component="span" size="xs" c="dimmed">
                            顯示
                            {displayView === "participants"
                                ? visibleParticipants.length
                                : visibleCourses.length}
                            筆資料，共 {activeItems.length} 筆
                        </Text>
                        <div className={styles.pagination}>
                            <ActionIcon
                                variant="default"
                                radius="xl"
                                aria-label="上一頁"
                                disabled={currentPage <= 1}
                                onClick={() => setPage(currentPage - 1)}
                            >
                                <ArrowLeft aria-hidden="true" />
                            </ActionIcon>
                            <Text component="span" size="xs">
                                {currentPage} / {totalPages}
                            </Text>
                            <ActionIcon
                                variant="default"
                                radius="xl"
                                aria-label="下一頁"
                                disabled={currentPage >= totalPages}
                                onClick={() => setPage(currentPage + 1)}
                            >
                                <ArrowRight aria-hidden="true" />
                            </ActionIcon>
                        </div>
                    </footer>
                </Card>
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
