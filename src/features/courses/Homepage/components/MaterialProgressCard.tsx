import { Card, Text, Title } from "@mantine/core";

export type MaterialStatus = "done" | "in_progress" | "not_started";

export type MaterialListItem = {
    id: string;
    title: string;
    totalPages: number;
    completedPage: number;
    status: MaterialStatus;
};

const statusLabel: Record<MaterialStatus, string> = {
    done: "已完成",
    in_progress: "進行中",
    not_started: "未完成",
};

const statusColor: Record<MaterialStatus, string> = {
    done: "teal.7",
    in_progress: "orange.6",
    not_started: "gray.5",
};

function getProgressLabel(
    item: MaterialListItem,
    status: MaterialStatus
) {
    switch (status) {
        case "done":
            return `共 ${item.totalPages} 頁．已完成全部`;

        case "in_progress":
            return `共 ${item.totalPages} 頁．已完成第 ${item.completedPage} 頁`;

        case "not_started":
            return `共 ${item.totalPages} 頁．尚未開始`;
    }
}

type Props = {
    items: MaterialListItem[];
};

export default function MaterialProgressCard({ items }: Props) {
    const doneCount = items.filter((item) => item.status === "done").length;

    return (
        <Card radius="lg" p="1.75rem" shadow="xs">
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "1.25rem",
                }}
            >
                <Title order={3} fz="1.125rem" fw={700} c="dark.9">
                    今日教材
                </Title>
                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "20px",
                        padding: "0 10px",
                        borderRadius: "32px",
                        backgroundColor: "var(--color-teal-100)",
                        color: "var(--color-teal-900)",
                        fontSize: "11px",
                        fontWeight: 700,
                    }}
                >
                    {doneCount}/{items.length} 完成
                </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {items.map((item) => {
                    const status = item.status;
                    return (
                        <div
                            key={item.id}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                flexWrap: "nowrap",
                                gap: "0.75rem",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.125rem",
                                    flex: 1,
                                    minWidth: 0,
                                }}
                            >
                                <Text fz="0.9375rem" fw={600} c="dark.9">
                                    {item.title}
                                </Text>
                               <Text fz="0.75rem" c="dimmed">
                                {getProgressLabel(item, status)}
                                </Text>
                            </div>
                            <Text
                                fz="0.8125rem"
                                fw={600}
                                c={statusColor[status]}
                                style={{ whiteSpace: "nowrap", flexShrink: 0 }}
                            >
                                {statusLabel[status]}
                            </Text>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}
