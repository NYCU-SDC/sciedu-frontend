import { ArrowRight } from "lucide-react";
import { Button, Card, Stack, Text, Title } from "@mantine/core";

export type MaterialStatus = "done" | "in_progress" | "not_started";

const statusLabel: Record<MaterialStatus, string> = {
    done: "已完成",
    in_progress: "未完成",
    not_started: "未完成",
};

const statusColor: Record<MaterialStatus, string> = {
    done: "teal.7",
    in_progress: "orange.6",
    not_started: "orange.6",
};

function getMetaText(
    status: MaterialStatus,
    totalPages: number,
    completedPage: number
) {
    if (status === "done") {
        return `共 ${totalPages} 頁．已全部完成`;
    }
    if (status === "in_progress") {
        return `共 ${totalPages} 頁．已完成第 ${completedPage} 頁`;
    }
    return `共 ${totalPages} 頁．尚未開始`;
}

type Props = {
    title: string;
    totalPages: number;
    completedPage: number;
    status: MaterialStatus;
    onContinue?: () => void;
};

export default function MaterialCard({
    title,
    totalPages,
    completedPage,
    status,
    onContinue,
}: Props) {
    return (
        <Card
            radius="lg"
            p="1.75rem"
            shadow="xs"
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
            <Stack gap={6} style={{ flex: 1 }}>
                <Text fw={700} fz="0.8125rem" c={statusColor[status]}>
                    {statusLabel[status]}
                </Text>
                <Title order={3} fz="1.25rem" fw={700} c="dark.9">
                    {title}
                </Title>
                <Text fz="0.8125rem" c="dimmed">
                    {getMetaText(status, totalPages, completedPage)}
                </Text>
            </Stack>
            <Button
                radius="md"
                color="brandTeal"
                rightSection={<ArrowRight size={16} />}
                onClick={onContinue}
                style={{ alignSelf: "flex-start" }}
            >
                繼續目前任務
            </Button>
        </Card>
    );
}
