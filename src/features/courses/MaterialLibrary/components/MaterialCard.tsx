import { ArrowRight } from "lucide-react";
import { Button, Card, Text, Title } from "@mantine/core";
import {
    getMaterialProgressLabel,
    type MaterialStatus,
} from "../../materialProgress";

export type { MaterialStatus } from "../../materialProgress";

const statusLabel: Record<MaterialStatus, string> = {
    done: "已完成",
    in_progress: "未完成",
    not_started: "未完成",
};

const statusColor: Record<MaterialStatus, string> = {
    done: "#00856e",
    in_progress: "#925800",
    not_started: "#925800",
};

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
            radius="16px"
            h="257px"
            style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "flex-start",
                gap: "16px",
                padding: "27px 45px",
                backgroundColor: "#ffffff",
                border: "1px solid #d4d4d4",
                boxShadow: "0px 16px 40px rgba(44, 79, 71, 0.08)",
            }}
        >
            <Text fz="14px" lh="19px" fw={400} c={statusColor[status]}>
                {statusLabel[status]}
            </Text>
            <Title order={3} fz="32px" lh="43px" fw={700} c="#000000">
                {title}
            </Title>
            <Text fz="14px" lh="19px" c="var(--color-neutral-600)">
                {getMaterialProgressLabel({
                    status,
                    totalPages,
                    completedPage,
                })}
            </Text>
            <Button
                radius="16px"
                rightSection={<ArrowRight size={24} color="#ffffff" />}
                onClick={onContinue}
                styles={{
                    root: {
                        width: "164px",
                        height: "48px",
                        padding: "12px 18px",
                        backgroundColor: "#005f55",
                        color: "#ffffff",
                        border: "none",
                    },
                    label: {
                        fontSize: "16px",
                        fontWeight: 400,
                        lineHeight: "21px",
                        whiteSpace: "nowrap",
                        overflow: "visible",
                    },
                    section: {
                        marginInlineStart: "8px",
                    },
                }}
            >
                繼續目前任務
            </Button>
        </Card>
    );
}
