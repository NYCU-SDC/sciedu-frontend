import { ArrowRight } from "lucide-react";
import { Button, Card, Stack, Text, Title } from "@mantine/core";

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
            radius="lg"
            p="1.75rem"
            shadow="xs"
            style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "2.5rem",
                minHeight: "15rem",
            }}
        >
            <Stack gap={6}>
                <Text fw={600} fz="0.875rem" c="brandTeal.8">
                    {eyebrow}
                </Text>
                <Title order={3} fz="1.5rem" fw={700} c="dark.9">
                    {title}
                </Title>
                <Text fz="0.8125rem" c="dimmed">
                    共 {totalPages} 頁．已完成第 {completedPage} 頁
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
