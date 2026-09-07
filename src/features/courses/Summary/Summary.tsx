import { Box } from "@mantine/core";
import { useNavigate } from "react-router";
import Header from "./components/Header";
import StatusBar from "./components/main/StatusBar";
import ResultCard from "./components/main/ResultCard";

export default function Summary() {
    const navigate = useNavigate();

    return (
        <Box
            mih="100vh"
            bg="#f0f6f4"
            p="48px 40px"
            style={{ display: "flex", flexDirection: "column" }}
        >
            <Header />
            <Box
                component="main"
                pt="16px"
                pb="16px"
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
                <StatusBar />
                <Box px="10px">
                    <ResultCard
                        title="教材已完成！"
                        materialTitle="碗豆－種皮形狀"
                        description="點擊下方返回查看教材、作答情況，以及詳解"
                        correctCount={3}
                        wrongCount={2}
                        duration="08:24"
                        onDetailClick={() => navigate("/courses/library")}
                    />
                </Box>
            </Box>
        </Box>
    );
}
