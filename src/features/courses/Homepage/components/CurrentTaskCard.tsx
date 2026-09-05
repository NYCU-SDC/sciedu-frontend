import { ArrowRight } from "lucide-react";
import { Button, Card, Text, Title } from "@mantine/core";

type Props = {
    eyebrow: string;
    title: string;
    totalPages: number;
    completedPage: number;
    onContinue?: () => void;
};

export default function CurrentTaskCard({
    eyebrow,
    title,
    totalPages,
    completedPage,
    onContinue,
}: Props) {
    return (
        <Card
            radius="16px"
            style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "flex-start",
                gap: "16px",
                padding: "27px 45px",
                minHeight: "15rem",
                backgroundColor: "#ffffff",
                border: "1px solid #d4d4d4",
                boxShadow: "0px 16px 40px rgba(44, 79, 71, 0.08)",
            }}
        >
            <Text fw={700} fz="24px" lh="32px" c="var(--color-brand-teal-dark)">
                {eyebrow}
            </Text>
            <Title order={3} fz="32px" fw={700} lh="43px" c="#000000">
                {title}
            </Title>
            <Text fz="14px" lh="19px" c="var(--color-neutral-600)">
                共 {totalPages} 頁．已完成第 {completedPage} 頁
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

                    // 重要
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
