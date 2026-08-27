import { Badge, Divider, Group, Stack, Text, Title } from "@mantine/core";

export default function Header() {
    return (
        <Group
            justify="space-between"
            wrap="nowrap"
            gap="1.5rem"
            px="2.5rem"
            py="1.375rem"
            bg="brandTeal.5"
            style={{ borderRadius: "0 0 1rem 1rem" }}
        >
            <Group gap="1.25rem" wrap="nowrap" style={{ minWidth: 0 }}>
                <Text
                    fw={700}
                    fz="1.125rem"
                    c="dark.9"
                    style={{ whiteSpace: "nowrap" }}
                >
                    SciEdu
                </Text>
                <Divider
                    orientation="vertical"
                    color="rgba(15, 23, 43, 0.25)"
                    size="sm"
                />
                <Stack gap={2} style={{ minWidth: 0 }}>
                    <Title order={1} fz="1.375rem" fw={700} c="dark.9" lh={1.3}>
                        教材首頁
                    </Title>
                    <Text fz="0.8rem" c="dark.9" opacity={0.7}>
                        今日任務．學習概況．教材瀏覽
                    </Text>
                </Stack>
            </Group>
            <Badge
                size="lg"
                radius="xl"
                variant="white"
                c="brandTeal.8"
                fw={600}
                fz="0.875rem"
                style={{
                    backgroundColor: "rgba(255, 255, 255, 0.92)",
                    flexShrink: 0,
                }}
            >
                學生模式
            </Badge>
        </Group>
    );
}
