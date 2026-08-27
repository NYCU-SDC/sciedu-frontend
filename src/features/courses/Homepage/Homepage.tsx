import { ArrowRight } from "lucide-react";
import {
    Box,
    Button,
    Group,
    SimpleGrid,
    Stack,
    Text,
    Title,
} from "@mantine/core";
import { useNavigate } from "react-router";
import Header from "./components/Header";
import CurrentTaskCard from "./components/CurrentTaskCard";
import MaterialProgressCard, {
    type MaterialListItem,
} from "./components/MaterialProgressCard";

const todayMaterials: MaterialListItem[] = [
    {
        id: "cell-division",
        title: "細胞分裂",
        totalPages: 3,
        completedPage: 1,
        status: "done",
    },
    {
        id: "pea-seed-coat-current",
        title: "碗豆－種皮形狀",
        totalPages: 3,
        completedPage: 1,
        status: "in_progress",
    },
    {
        id: "pea-seed-coat-next",
        title: "碗豆－種皮形狀",
        totalPages: 3,
        completedPage: 1,
        status: "not_started",
    },
];

export default function Homepage() {
    const navigate = useNavigate();

    return (
        <Box
            mih="100vh"
            bg="#eef3f1"
            style={{ display: "flex", flexDirection: "column" }}
        >
            <Header />
            <Box component="main" p="2rem 2.5rem 3rem">
                <Group justify="space-between" align="flex-start" mb="1.5rem">
                    <Stack gap={6}>
                        <Title order={2} fz="1.5rem" fw={700} c="brandTeal.8">
                            今日任務
                        </Title>
                        <Text fz="0.875rem" c="dimmed">
                            請優先完成教師今日安排的教材
                        </Text>
                    </Stack>
                    <Button
                        variant="default"
                        radius="xl"
                        rightSection={<ArrowRight size={16} />}
                        style={{ flexShrink: 0 }}
                        onClick={() => navigate("/MaterialLibrary")}
                    >
                        查看教材書櫃
                    </Button>
                </Group>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="1.5rem">
                    <CurrentTaskCard
                        eyebrow="開始實驗任務"
                        title="碗豆－種皮形狀"
                        totalPages={3}
                        completedPage={1}
                    />
                    <MaterialProgressCard items={todayMaterials} />
                </SimpleGrid>
            </Box>
        </Box>
    );
}
