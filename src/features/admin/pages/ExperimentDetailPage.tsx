import { useMemo, useState } from "react";
import {
    ActionIcon,
    Badge,
    Button,
    Card,
    Group,
    Menu,
    Progress,
    Select,
    Table,
    Tabs,
    TextInput,
    Title,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MoreVertical, Plus, Search, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { useDocumentTitle } from "../../../shared/hooks";
import { ApiError } from "../../../shared/utils/api";
import AddParticipantModal from "../components/AddParticipantModal";
import ExperimentAdminShell from "../components/ExperimentAdminShell";
import {
    experimentStatusLabels,
    formatDateTime,
    formatShortDateTime,
    roleLabels,
} from "../formatters";
import {
    fetchExperiment,
    listExperimentCourses,
    listExperimentParticipants,
    removeExperimentParticipant,
    updateExperimentStatus,
} from "../services/adminRepository";
import type { ExperimentStatus, UserRole } from "../types";
import styles from "./ExperimentAdmin.module.css";

type DetailTab = "settings" | "courses" | "students";

const releaseLabels = {
    AFTER_PAGE_SUBMISSION: "每頁完成後公開",
    AFTER_COURSE_COMPLETION: "完成整份教材後公開",
    NEVER: "不公開正確答案",
};

function mutationErrorMessage(error: unknown) {
    return error instanceof ApiError && error.message
        ? error.message
        : "操作失敗，請稍後再試";
}

export default function ExperimentDetailPage() {
    useDocumentTitle("實驗詳細資料");
    const { experimentId = "" } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [tab, setTab] = useState<DetailTab>("settings");
    const [search, setSearch] = useState("");
    const [role, setRole] = useState<UserRole | null>(null);
    const [isAddingStudents, setAddingStudents] = useState(false);

    const experimentQuery = useQuery({
        queryKey: ["admin", "experiments", experimentId, "detail"],
        queryFn: () => fetchExperiment(experimentId),
        enabled: Boolean(experimentId),
    });
    const coursesQuery = useQuery({
        queryKey: ["admin", "experiments", experimentId, "courses"],
        queryFn: () => listExperimentCourses(experimentId),
        enabled: Boolean(experimentId),
    });
    const participantsQuery = useQuery({
        queryKey: ["admin", "experiments", experimentId, "participants"],
        queryFn: () => listExperimentParticipants(experimentId),
        enabled: Boolean(experimentId),
    });
    const removeMutation = useMutation({
        mutationFn: (userId: string) =>
            removeExperimentParticipant(experimentId, userId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["admin", "experiments", experimentId],
            });
            toast.success("已從本場實驗移除學生");
        },
        onError: (error) => toast.error(mutationErrorMessage(error)),
    });
    const statusMutation = useMutation({
        mutationFn: (status: ExperimentStatus) =>
            updateExperimentStatus(experimentId, status),
        onSuccess: async (_, status) => {
            await queryClient.invalidateQueries({
                queryKey: ["admin", "experiments"],
            });
            toast.success(status === "SCHEDULED" ? "實驗已排程" : "實驗已封存");
        },
        onError: (error) => toast.error(mutationErrorMessage(error)),
    });

    const filteredParticipants = useMemo(() => {
        const normalized = search.trim().toLocaleLowerCase("zh-Hant");
        return (participantsQuery.data ?? []).filter(
            ({ participant }) =>
                (!normalized ||
                    participant.name
                        .toLocaleLowerCase("zh-Hant")
                        .includes(normalized) ||
                    participant.email
                        .toLocaleLowerCase()
                        .includes(normalized)) &&
                (!role || participant.roles.includes(role))
        );
    }, [participantsQuery.data, role, search]);

    if (experimentQuery.isPending) {
        return <div className={styles.pageStatus}>載入實驗詳細資料中⋯</div>;
    }
    if (experimentQuery.isError || !experimentQuery.data) {
        return <div className={styles.pageStatus}>實驗詳細資料載入失敗</div>;
    }

    const experiment = experimentQuery.data;
    const isLocked = ["ACTIVE", "COMPLETED", "ARCHIVED"].includes(
        experiment.status
    );
    const canAddStudents = !["COMPLETED", "ARCHIVED"].includes(
        experiment.status
    );
    const canRemoveStudents = ["DRAFT", "SCHEDULED"].includes(
        experiment.status
    );
    const hasPublishedCourse = coursesQuery.data?.some(
        ({ course }) => course.status === "PUBLISHED"
    );
    const statusColor =
        experiment.status === "ACTIVE"
            ? "teal"
            : experiment.status === "SCHEDULED"
              ? "cyan"
              : "gray";

    return (
        <ExperimentAdminShell activeSection="experiments">
            <div className={styles.contentStack}>
                <header className={styles.pageHeader}>
                    <div className={styles.titleGroup}>
                        <ActionIcon
                            className={styles.backButton}
                            variant="subtle"
                            aria-label="返回實驗列表"
                            onClick={() => navigate("/admin/experiments")}
                        >
                            <ArrowLeft aria-hidden="true" />
                        </ActionIcon>
                        <Title order={1}>{experiment.name}</Title>
                        <Badge color={statusColor} variant="light">
                            {experimentStatusLabels[experiment.status]}
                        </Badge>
                    </div>
                    <Group gap="sm">
                        {experiment.status === "ACTIVE" && (
                            <Button
                                onClick={() =>
                                    navigate(
                                        `/admin/experiments/${experimentId}/edit`
                                    )
                                }
                            >
                                延長結束時間
                            </Button>
                        )}
                        {experiment.status === "DRAFT" && (
                            <Button
                                variant="default"
                                onClick={() =>
                                    navigate(
                                        `/admin/experiments/${experimentId}/edit`
                                    )
                                }
                            >
                                編輯實驗
                            </Button>
                        )}
                        {experiment.status === "SCHEDULED" && (
                            <Button
                                variant="default"
                                onClick={() =>
                                    navigate(
                                        `/admin/experiments/${experimentId}/edit`
                                    )
                                }
                            >
                                編輯實驗
                            </Button>
                        )}
                        {experiment.status === "DRAFT" && (
                            <Button
                                loading={statusMutation.isPending}
                                disabled={!hasPublishedCourse}
                                title={
                                    !hasPublishedCourse
                                        ? "排程前至少需要一份已發布教材"
                                        : undefined
                                }
                                onClick={() =>
                                    statusMutation.mutate("SCHEDULED")
                                }
                            >
                                排程實驗
                            </Button>
                        )}
                        {experiment.status === "COMPLETED" && (
                            <Button
                                loading={statusMutation.isPending}
                                onClick={() => {
                                    if (
                                        window.confirm("確定要封存這場實驗嗎？")
                                    )
                                        statusMutation.mutate("ARCHIVED");
                                }}
                            >
                                封存實驗
                            </Button>
                        )}
                    </Group>
                </header>

                <Card
                    className={`${styles.card} ${styles.summary}`}
                    radius="lg"
                >
                    <div className={styles.metric}>
                        <span>實驗時段</span>
                        <strong>
                            {formatDateTime(experiment.scheduledStartAt)} –{" "}
                            {formatShortDateTime(experiment.scheduledEndAt)}
                        </strong>
                    </div>
                    <div className={styles.metric}>
                        <span>教材</span>
                        <strong>{experiment.courseCount} 份</strong>
                    </div>
                    <div className={styles.metric}>
                        <span>參與學生</span>
                        <strong>{experiment.participantCount} 人</strong>
                    </div>
                    <div className={styles.metric}>
                        <span>建立者</span>
                        <strong title="API 目前只提供建立者 ID">
                            {experiment.createdBy}
                        </strong>
                    </div>
                    <div className={styles.metric}>
                        <span>最後更新</span>
                        <strong>
                            {formatShortDateTime(experiment.updatedAt)}
                        </strong>
                    </div>
                </Card>

                <Card className={`${styles.card} ${styles.tabs}`} radius="lg">
                    <Tabs
                        value={tab}
                        onChange={(value) =>
                            setTab((value ?? "settings") as DetailTab)
                        }
                    >
                        <Tabs.List className={styles.tabsList}>
                            <Tabs.Tab
                                className={styles.tabsTab}
                                value="settings"
                            >
                                實驗設定
                            </Tabs.Tab>
                            <Tabs.Tab
                                className={styles.tabsTab}
                                value="courses"
                            >
                                教材（{experiment.courseCount}）
                            </Tabs.Tab>
                            <Tabs.Tab
                                className={styles.tabsTab}
                                value="students"
                            >
                                學生（{experiment.participantCount}）
                            </Tabs.Tab>
                        </Tabs.List>
                    </Tabs>
                </Card>

                {tab === "settings" && (
                    <div className={styles.detailGrid}>
                        <Card
                            className={`${styles.card} ${styles.settingsCard}`}
                            radius="lg"
                        >
                            <Group justify="space-between">
                                <Title
                                    order={2}
                                    className={styles.sectionTitle}
                                >
                                    實驗設定
                                </Title>
                                {!["COMPLETED", "ARCHIVED"].includes(
                                    experiment.status
                                ) && (
                                    <Button
                                        variant="default"
                                        onClick={() =>
                                            navigate(
                                                `/admin/experiments/${experimentId}/edit`
                                            )
                                        }
                                    >
                                        編輯允許項目
                                    </Button>
                                )}
                            </Group>
                            <div className={styles.settingRows}>
                                <div className={styles.settingRow}>
                                    <span>實驗名稱</span>
                                    <strong>{experiment.name}</strong>
                                </div>
                                <div className={styles.settingRow}>
                                    <span>實驗說明</span>
                                    <strong>
                                        {experiment.description || "—"}
                                    </strong>
                                </div>
                                <div className={styles.settingRow}>
                                    <span>
                                        開始時間
                                        {isLocked && (
                                            <small className={styles.lock}>
                                                鎖定
                                            </small>
                                        )}
                                    </span>
                                    <strong>
                                        {formatDateTime(
                                            experiment.scheduledStartAt
                                        )}
                                    </strong>
                                </div>
                                <div className={styles.settingRow}>
                                    <span>結束時間</span>
                                    <strong>
                                        {formatDateTime(
                                            experiment.scheduledEndAt
                                        )}
                                    </strong>
                                </div>
                                <div className={styles.settingRow}>
                                    <span>
                                        評分方式
                                        {isLocked && (
                                            <small className={styles.lock}>
                                                鎖定
                                            </small>
                                        )}
                                    </span>
                                    <strong>
                                        {experiment.configuration
                                            .gradingMode === "AUTOMATIC"
                                            ? "自動評分"
                                            : "人工評分"}
                                    </strong>
                                </div>
                                <div className={styles.settingRow}>
                                    <span>
                                        重新作答
                                        {isLocked && (
                                            <small className={styles.lock}>
                                                鎖定
                                            </small>
                                        )}
                                    </span>
                                    <strong>
                                        {experiment.configuration.allowRetry
                                            ? `允許・最多 ${experiment.configuration.maxAttempts} 次`
                                            : "不允許"}
                                    </strong>
                                </div>
                                <div className={styles.settingRow}>
                                    <span>
                                        結果顯示
                                        {isLocked && (
                                            <small className={styles.lock}>
                                                鎖定
                                            </small>
                                        )}
                                    </span>
                                    <strong>
                                        {experiment.configuration
                                            .showExplanations
                                            ? "顯示分數與詳解"
                                            : experiment.configuration.showScore
                                              ? "只顯示分數"
                                              : "不顯示"}
                                    </strong>
                                </div>
                                <div className={styles.settingRow}>
                                    <span>
                                        正確答案
                                        {isLocked && (
                                            <small className={styles.lock}>
                                                鎖定
                                            </small>
                                        )}
                                    </span>
                                    <strong>
                                        {
                                            releaseLabels[
                                                experiment.configuration
                                                    .correctAnswerReleaseMode
                                            ]
                                        }
                                    </strong>
                                </div>
                            </div>
                        </Card>
                        <Card
                            className={`${styles.card} ${styles.noticeCard}`}
                            radius="lg"
                        >
                            <Title order={2} className={styles.sectionTitle}>
                                {experimentStatusLabels[experiment.status]}
                                的實驗
                            </Title>
                            <p className={styles.muted}>
                                依狀態保護學生作答資料與實驗條件。
                            </p>
                            <ul className={styles.noticeList}>
                                <li>可修改名稱與說明</li>
                                <li>可新增或移除學生</li>
                                <li>排程後不可更換教材</li>
                                <li>開始後不可修改評分與答案公開設定</li>
                            </ul>
                            <div className={styles.warning}>
                                系統會依照目前狀態限制可修改的欄位與人員、教材操作。
                            </div>
                        </Card>
                    </div>
                )}

                {tab === "courses" && (
                    <Card
                        className={`${styles.card} ${styles.coursesCard}`}
                        radius="lg"
                    >
                        <div className={styles.courseHeader}>
                            <div>
                                <Title
                                    order={2}
                                    className={styles.sectionTitle}
                                >
                                    教材
                                </Title>
                                <p className={styles.muted}>
                                    共 {coursesQuery.data?.length ?? 0} 份教材
                                </p>
                            </div>
                            <div className={styles.gapNote}>
                                {experiment.status === "DRAFT"
                                    ? "可從編輯實驗調整教材"
                                    : "目前狀態不可更換教材"}
                            </div>
                        </div>
                        {coursesQuery.isPending ? (
                            <p className={styles.empty}>載入教材中⋯</p>
                        ) : coursesQuery.isError ? (
                            <p className={styles.empty}>教材載入失敗</p>
                        ) : (
                            <div className={styles.courseList}>
                                {coursesQuery.data?.map(({ course }, index) => (
                                    <article
                                        className={styles.courseRow}
                                        key={course.id}
                                    >
                                        <span className={styles.courseIndex}>
                                            {String(index + 1).padStart(2, "0")}
                                        </span>
                                        <div>
                                            <strong>{course.title}</strong>
                                            <div className={styles.courseMeta}>
                                                {course.code}・
                                                {course.status === "PUBLISHED"
                                                    ? "已發布"
                                                    : "草稿"}
                                            </div>
                                        </div>
                                        <div>
                                            <div
                                                className={styles.progressText}
                                            >
                                                學生進度：API 尚未提供
                                            </div>
                                            <Progress value={0} color="teal" />
                                        </div>
                                        <Button
                                            variant="subtle"
                                            disabled
                                            title="教材檢視路由尚未定義"
                                        >
                                            查看教材 →
                                        </Button>
                                    </article>
                                ))}
                            </div>
                        )}
                    </Card>
                )}

                {tab === "students" && (
                    <Card
                        className={`${styles.card} ${styles.participantsCard}`}
                        radius="lg"
                    >
                        <div className={styles.participantToolbar}>
                            <span className={styles.muted}>
                                本場次實驗參與者
                            </span>
                            <div className={styles.participantControls}>
                                <TextInput
                                    type="search"
                                    placeholder="搜尋姓名或郵件"
                                    maxLength={200}
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.currentTarget.value)
                                    }
                                    leftSection={
                                        <Search size={16} aria-hidden="true" />
                                    }
                                />
                                <Select
                                    clearable
                                    placeholder="全部角色"
                                    value={role}
                                    onChange={(value) =>
                                        setRole(value as UserRole | null)
                                    }
                                    data={Object.entries(roleLabels).map(
                                        ([value, label]) => ({ value, label })
                                    )}
                                />
                                {canAddStudents && (
                                    <Button
                                        leftSection={
                                            <Plus
                                                size={16}
                                                aria-hidden="true"
                                            />
                                        }
                                        onClick={() => setAddingStudents(true)}
                                    >
                                        加入人員
                                    </Button>
                                )}
                            </div>
                        </div>
                        {participantsQuery.isPending ? (
                            <p className={styles.empty}>載入學生中⋯</p>
                        ) : participantsQuery.isError ? (
                            <p className={styles.empty}>學生載入失敗</p>
                        ) : (
                            <div className={styles.tableScroll}>
                                <Table
                                    className={styles.table}
                                    horizontalSpacing="lg"
                                    verticalSpacing="md"
                                >
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>姓名</Table.Th>
                                            <Table.Th>郵件</Table.Th>
                                            <Table.Th>角色</Table.Th>
                                            <Table.Th>加入實驗時間</Table.Th>
                                            <Table.Th>帳號建立時間</Table.Th>
                                            <Table.Th aria-label="操作" />
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {filteredParticipants.map(
                                            ({ participant, assignedAt }) => (
                                                <Table.Tr key={participant.id}>
                                                    <Table.Td>
                                                        {participant.name}
                                                    </Table.Td>
                                                    <Table.Td>
                                                        {participant.email}
                                                    </Table.Td>
                                                    <Table.Td>
                                                        {participant.roles
                                                            .map(
                                                                (item) =>
                                                                    roleLabels[
                                                                        item
                                                                    ]
                                                            )
                                                            .join("、")}
                                                    </Table.Td>
                                                    <Table.Td>
                                                        {formatDateTime(
                                                            assignedAt
                                                        )}
                                                    </Table.Td>
                                                    <Table.Td>
                                                        {formatDateTime(
                                                            participant.createdAt
                                                        )}
                                                    </Table.Td>
                                                    <Table.Td>
                                                        {canRemoveStudents && (
                                                            <Menu position="bottom-end">
                                                                <Menu.Target>
                                                                    <ActionIcon
                                                                        variant="subtle"
                                                                        aria-label={`開啟 ${participant.name} 的操作選單`}
                                                                    >
                                                                        <MoreVertical
                                                                            size={
                                                                                18
                                                                            }
                                                                        />
                                                                    </ActionIcon>
                                                                </Menu.Target>
                                                                <Menu.Dropdown>
                                                                    <Menu.Item
                                                                        color="red"
                                                                        leftSection={
                                                                            <Trash2
                                                                                size={
                                                                                    16
                                                                                }
                                                                            />
                                                                        }
                                                                        disabled={
                                                                            removeMutation.isPending
                                                                        }
                                                                        onClick={() => {
                                                                            if (
                                                                                window.confirm(
                                                                                    `確定要將 ${participant.name} 從本場實驗移除嗎？`
                                                                                )
                                                                            )
                                                                                removeMutation.mutate(
                                                                                    participant.id
                                                                                );
                                                                        }}
                                                                    >
                                                                        刪除
                                                                    </Menu.Item>
                                                                </Menu.Dropdown>
                                                            </Menu>
                                                        )}
                                                    </Table.Td>
                                                </Table.Tr>
                                            )
                                        )}
                                    </Table.Tbody>
                                </Table>
                            </div>
                        )}
                    </Card>
                )}
            </div>
            {isAddingStudents && (
                <AddParticipantModal
                    experimentId={experimentId}
                    onClose={() => setAddingStudents(false)}
                />
            )}
        </ExperimentAdminShell>
    );
}
