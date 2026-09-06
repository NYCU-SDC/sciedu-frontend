import { useState } from "react";
import {
    Badge,
    Button,
    Card,
    Group,
    Select,
    Table,
    TextInput,
    Title,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router";

import { useDocumentTitle } from "../../../shared/hooks";
import ExperimentAdminShell from "../components/ExperimentAdminShell";
import {
    experimentStatusLabels,
    formatDateTime,
    formatShortDateTime,
} from "../formatters";
import { listExperiments } from "../services/adminRepository";
import type { ExperimentStatus } from "../types";
import styles from "./ExperimentAdmin.module.css";

const statusColors: Record<ExperimentStatus, string> = {
    DRAFT: "gray",
    SCHEDULED: "cyan",
    ACTIVE: "teal",
    COMPLETED: "gray",
    ARCHIVED: "dark",
};

export default function ExperimentListPage() {
    useDocumentTitle("實驗管理");
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<ExperimentStatus | null>(null);
    const experimentsQuery = useQuery({
        queryKey: ["admin", "experiments", "management", search, status],
        queryFn: () =>
            listExperiments({
                page: 1,
                pageSize: 100,
                search,
                status: status ?? undefined,
            }),
    });

    const experiments = experimentsQuery.data?.items ?? [];
    return (
        <ExperimentAdminShell activeSection="experiments">
            <div className={styles.contentStack}>
                <header className={styles.pageHeader}>
                    <Title order={1}>實驗管理</Title>
                    <Button
                        leftSection={<Plus size={18} aria-hidden="true" />}
                        onClick={() => navigate("/admin/experiments/new")}
                    >
                        新增實驗
                    </Button>
                </header>

                <section className={styles.listIntro}>
                    <div>
                        <Title order={2}>所有實驗</Title>
                        <p className={styles.muted}>
                            管理實驗時段、教材與參與學生。進行中的實驗會優先顯示。
                        </p>
                    </div>
                </section>

                <Card
                    className={`${styles.card} ${styles.filters}`}
                    radius="lg"
                >
                    <TextInput
                        type="search"
                        aria-label="搜尋實驗名稱"
                        placeholder="搜尋實驗名稱"
                        value={search}
                        onChange={(event) =>
                            setSearch(event.currentTarget.value)
                        }
                        leftSection={<Search size={16} aria-hidden="true" />}
                    />
                    <Select
                        aria-label="篩選實驗狀態"
                        placeholder="全部狀態"
                        clearable
                        value={status}
                        onChange={(value) =>
                            setStatus(value as ExperimentStatus | null)
                        }
                        data={Object.entries(experimentStatusLabels).map(
                            ([value, label]) => ({ value, label })
                        )}
                    />
                    <Select
                        disabled
                        placeholder="實驗日期"
                        title="API 尚未提供日期篩選"
                        data={[]}
                    />
                    <Select
                        disabled
                        placeholder="全部建立者"
                        title="API 尚未提供建立者篩選"
                        data={[]}
                    />
                    <Button
                        variant="subtle"
                        onClick={() => {
                            setSearch("");
                            setStatus(null);
                        }}
                    >
                        清除篩選
                    </Button>
                </Card>

                <Card
                    className={`${styles.card} ${styles.tableCard}`}
                    radius="lg"
                >
                    <div className={styles.tableTop}>
                        <strong>
                            共 {experimentsQuery.data?.totalItems ?? 0} 場實驗
                        </strong>
                        <span className={styles.muted}>排序：管理急迫性</span>
                    </div>
                    {experimentsQuery.isPending ? (
                        <p className={styles.empty}>載入實驗中⋯</p>
                    ) : experimentsQuery.isError ? (
                        <p className={styles.empty}>實驗列表載入失敗</p>
                    ) : experiments.length === 0 ? (
                        <p className={styles.empty}>找不到符合條件的實驗</p>
                    ) : (
                        <div className={styles.tableScroll}>
                            <Table
                                className={styles.table}
                                horizontalSpacing="lg"
                                verticalSpacing="md"
                                highlightOnHover
                            >
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>實驗名稱</Table.Th>
                                        <Table.Th>狀態</Table.Th>
                                        <Table.Th>實驗時段</Table.Th>
                                        <Table.Th>教材</Table.Th>
                                        <Table.Th>學生</Table.Th>
                                        <Table.Th>建立者</Table.Th>
                                        <Table.Th>最後更新</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {experiments.map((experiment) => {
                                        const counts =
                                            experiment as typeof experiment & {
                                                courseCount?: number;
                                                participantCount?: number;
                                            };
                                        return (
                                            <Table.Tr
                                                key={experiment.id}
                                                className={styles.clickableRow}
                                                tabIndex={0}
                                                onClick={() =>
                                                    navigate(
                                                        `/admin/experiments/${experiment.id}`
                                                    )
                                                }
                                                onKeyDown={(event) => {
                                                    if (
                                                        event.key === "Enter" ||
                                                        event.key === " "
                                                    )
                                                        navigate(
                                                            `/admin/experiments/${experiment.id}`
                                                        );
                                                }}
                                            >
                                                <Table.Td
                                                    className={
                                                        styles.experimentName
                                                    }
                                                >
                                                    {experiment.name}
                                                </Table.Td>
                                                <Table.Td>
                                                    <Badge
                                                        color={
                                                            statusColors[
                                                                experiment
                                                                    .status
                                                            ]
                                                        }
                                                        variant="light"
                                                    >
                                                        {
                                                            experimentStatusLabels[
                                                                experiment
                                                                    .status
                                                            ]
                                                        }
                                                    </Badge>
                                                </Table.Td>
                                                <Table.Td>
                                                    {experiment.status ===
                                                    "DRAFT"
                                                        ? "尚未完成排程"
                                                        : `${formatDateTime(experiment.scheduledStartAt)} – ${formatShortDateTime(experiment.scheduledEndAt)}`}
                                                </Table.Td>
                                                <Table.Td>
                                                    {counts.courseCount ===
                                                    undefined
                                                        ? "—"
                                                        : `${counts.courseCount} 份`}
                                                </Table.Td>
                                                <Table.Td>
                                                    {counts.participantCount ===
                                                    undefined
                                                        ? "—"
                                                        : `${counts.participantCount} 人`}
                                                </Table.Td>
                                                <Table.Td>
                                                    {experiment.createdBy}
                                                </Table.Td>
                                                <Table.Td>
                                                    {formatShortDateTime(
                                                        experiment.updatedAt
                                                    )}
                                                </Table.Td>
                                            </Table.Tr>
                                        );
                                    })}
                                </Table.Tbody>
                            </Table>
                        </div>
                    )}
                    <footer className={styles.tableFooter}>
                        <span>
                            顯示 {experiments.length} 筆資料，共{" "}
                            {experimentsQuery.data?.totalItems ?? 0} 筆
                        </span>
                        <Group gap="xs">
                            <Button variant="default" size="xs" disabled>
                                ←
                            </Button>
                            <span>
                                1 / {experimentsQuery.data?.totalPages ?? 1}
                            </span>
                            <Button variant="default" size="xs" disabled>
                                →
                            </Button>
                        </Group>
                    </footer>
                </Card>
            </div>
        </ExperimentAdminShell>
    );
}
