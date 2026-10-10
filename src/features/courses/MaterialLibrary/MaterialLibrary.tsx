import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";
import {
    Box,
    Button,
    Group,
    SimpleGrid,
    Stack,
    Text,
    Title,
} from "@mantine/core";

import CurrentExperimentState from "../components/CurrentExperimentState";
import { useCurrentExperimentCourses } from "../services/currentExperimentQueries";
import Header from "./components/Header";
import MaterialCard from "./components/MaterialCard";
import Pagination from "./components/Pagination";

const PAGE_SIZE = 6;
const FONT_FAMILY = '"GenYoGothicTW", sans-serif';

export default function MaterialLibrary() {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const { experiment, courses, error, isPending, refetch } =
        useCurrentExperimentCourses();
    const pageCount = Math.ceil(courses.length / PAGE_SIZE);
    const currentPage = pageCount === 0 ? 0 : Math.min(page, pageCount);
    const pageCourses = courses.slice(
        Math.max(0, currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    let content;
    if (isPending) {
        content = <CurrentExperimentState kind="loading" />;
    } else if (error) {
        content = (
            <CurrentExperimentState error={error} onRetry={() => refetch()} />
        );
    } else if (!experiment || experiment.status !== "ACTIVE") {
        content = <CurrentExperimentState kind="no-experiment" />;
    } else if (courses.length === 0) {
        content = <CurrentExperimentState kind="no-courses" />;
    } else {
        content = (
            <>
                <Group
                    bg="white"
                    p="0.875rem 1.5rem"
                    mb="1.5rem"
                    style={{
                        borderRadius: "1rem",
                        boxShadow: "0 1px 2px rgba(15, 23, 43, 0.06)",
                    }}
                >
                    <Text size="sm" c="dimmed">
                        {experiment.name}・共 {courses.length} 份已發布教材
                    </Text>
                </Group>
                <SimpleGrid
                    cols={{ base: 1, sm: 2, lg: 3 }}
                    spacing="1.5rem"
                    mih={{ base: "200px", sm: "409px" }}
                >
                    {pageCourses.map((course) => (
                        <MaterialCard
                            key={course.id}
                            title={course.title}
                            description={course.description}
                            onContinue={() => navigate(`/course/${course.id}`)}
                        />
                    ))}
                </SimpleGrid>
                <Pagination
                    page={currentPage}
                    pageCount={pageCount}
                    onPrev={() =>
                        setPage((previous) => Math.max(1, previous - 1))
                    }
                    onNext={() =>
                        setPage((previous) => Math.min(pageCount, previous + 1))
                    }
                />
            </>
        );
    }

    return (
        <Box
            mih="100vh"
            bg="#eef3f1"
            p="48px 40px"
            style={{ display: "flex", flexDirection: "column" }}
        >
            <Header />
            <Box component="main" pt="16px" pb="3rem">
                <Group justify="space-between" align="center" p="10px">
                    <Stack gap="10px">
                        <Title
                            order={2}
                            fz="32px"
                            lh="43px"
                            fw={700}
                            c="brandTeal.8"
                        >
                            教材書櫃
                        </Title>
                        <Text fz="14px" lh="19px" c="var(--color-neutral-600)">
                            目前實驗已發布的教材
                        </Text>
                    </Stack>
                    <Button
                        variant="default"
                        leftSection={<ArrowLeft size={24} color="#004038" />}
                        onClick={() => navigate("/courses")}
                        styles={{
                            root: {
                                height: "53px",
                                padding: "12px 18px",
                                backgroundColor: "#ffffff",
                                border: "1px solid #d4d4d4",
                                borderRadius: "16px",
                                boxShadow:
                                    "0px 16px 40px rgba(44, 79, 71, 0.08)",
                                flexShrink: 0,
                            },
                            label: {
                                fontFamily: FONT_FAMILY,
                                fontSize: "20px",
                                fontWeight: 500,
                                lineHeight: "27px",
                                color: "#004038",
                            },
                            section: { marginInlineEnd: "8px" },
                        }}
                    >
                        返回目前實驗
                    </Button>
                </Group>
                <Box pt="16px">{content}</Box>
            </Box>
        </Box>
    );
}
