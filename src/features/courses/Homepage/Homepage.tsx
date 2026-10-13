import { Box } from "@mantine/core";
import Header from "./components/Header";
import StatusBar from "./components/main/StatusBar";
import Library from "./components/main/Library";
import CurrentExperimentState from "../components/CurrentExperimentState";
import { useCurrentExperimentCourses } from "../services/currentExperimentQueries";

export default function Homepage() {
    const { experiment, courses, error, isPending, refetch } =
        useCurrentExperimentCourses();

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
        content = <Library experiment={experiment} courses={courses} />;
    }

    return (
        <Box
            mih="100vh"
            bg="#f0f6f4"
            p="48px 40px"
            style={{ display: "flex", flexDirection: "column" }}
        >
            <Header />
            <Box component="main" pt="16px" pb="16px">
                <StatusBar />
                {content}
            </Box>
        </Box>
    );
}
