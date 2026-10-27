import { ArrowRight } from "lucide-react";
import { Button, Card, Text, Title } from "@mantine/core";

type Props = {
    practice?: boolean;
    title: string;
    description?: string;
    onContinue?: () => void;
    onRestart?: () => void;
};

export default function MaterialCard({
    practice,
    title,
    description,
    onContinue,
    onRestart,
}: Props) {
    return (
        <Card
            radius="16px"
            mih="257px"
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
            <Text fz="14px" lh="19px" fw={400} c="#00856e">
                {practice ? "無限練習 · 本機保存" : "已發布"}
            </Text>
            <Title order={3} fz="32px" lh="43px" fw={700} c="#000000">
                {title}
            </Title>
            <Text fz="14px" lh="19px" c="var(--color-neutral-600)">
                {description || "開啟教材開始學習"}
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
                {practice ? "繼續練習" : "開啟教材"}
            </Button>
            {practice && (
                <Button variant="subtle" onClick={onRestart}>
                    重新練習
                </Button>
            )}
        </Card>
    );
}
