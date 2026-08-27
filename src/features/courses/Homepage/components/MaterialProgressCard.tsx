import { useState } from "react";
import { Check } from "lucide-react";
import {
    Badge,
    Card,
    Group,
    Stack,
    Text,
    Title,
    UnstyledButton,
} from "@mantine/core";

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

// 將 Checkbox 的背景與邊框樣式提取出來，避免在 style 裡面寫複雜的三元運算子
const checkboxBg: Record<MaterialStatus, string> = {
    done: "var(--mantine-color-brandTeal-8)",
    in_progress: "#000",
    not_started: "transparent",
};

type StatusCheckboxProps = {
    status: MaterialStatus;
    onClick: () => void;
};

function StatusCheckbox({ status, onClick }: StatusCheckboxProps) {
    const isDone = status === "done";

    return (
        <UnstyledButton
            type="button"
            role="checkbox"
            aria-checked={isDone}
            onClick={onClick}
            style={{
                width: "1.125rem",
                height: "1.125rem",
                flexShrink: 0,
                borderRadius: "0.3rem",
                border:
                    status === "not_started"
                        ? "1.5px solid var(--mantine-color-gray-4)"
                        : "none",
                backgroundColor: checkboxBg[status],
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {isDone && <Check size={12} strokeWidth={3} color="white" />}
        </UnstyledButton>
    );
}

type Props = {
    items: MaterialListItem[];
};

const statusCycle: MaterialStatus[] = ["not_started", "in_progress", "done"];

export default function MaterialProgressCard({ items }: Props) {
    const [statuses, setStatuses] = useState<Record<string, MaterialStatus>>(
        () => Object.fromEntries(items.map((item) => [item.id, item.status]))
    );

    const toggleItem = (id: string) => {
        setStatuses((prev) => {
            const currentStatus = prev[id] ?? "not_started";
            const currentIndex = statusCycle.indexOf(currentStatus);
            const nextStatus =
                statusCycle[(currentIndex + 1) % statusCycle.length];
            return { ...prev, [id]: nextStatus };
        });
    };

    const doneCount = Object.values(statuses).filter(
        (status) => status === "done"
    ).length;

    return (
        <Card radius="lg" p="1.75rem" shadow="xs">
            <Group justify="space-between" mb="1.25rem">
                <Title order={3} fz="1.125rem" fw={700} c="dark.9">
                    今日教材
                </Title>
                <Badge radius="xl" variant="light" color="brandTeal">
                    {doneCount}/{items.length} 完成
                </Badge>
            </Group>
            <Stack gap="1.25rem">
                {items.map((item) => {
                    const status = statuses[item.id] ?? item.status;
                    return (
                        <Group key={item.id} wrap="nowrap" gap="0.75rem">
                            <StatusCheckbox
                                status={status}
                                onClick={() => toggleItem(item.id)}
                            />
                            <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                                <Text fz="0.9375rem" fw={600} c="dark.9">
                                    {item.title}
                                </Text>
                                <Text fz="0.75rem" c="dimmed">
                                    共 {item.totalPages} 頁．已完成第{" "}
                                    {item.completedPage} 頁
                                </Text>
                            </Stack>
                            <Text
                                fz="0.8125rem"
                                fw={600}
                                c={statusColor[status]}
                                style={{ whiteSpace: "nowrap", flexShrink: 0 }}
                            >
                                {statusLabel[status]}
                            </Text>
                        </Group>
                    );
                })}
            </Stack>
        </Card>
    );
}
