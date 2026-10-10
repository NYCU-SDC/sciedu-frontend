import { Box, Button, Text, Title } from "@mantine/core";
import { useNavigate } from "react-router";
import Header from "./components/Header";

export default function Summary() {
    const navigate = useNavigate();
    // SCIEDU137 owns authenticated attempt/result rendering. This branch must
    // never present fixed demo scores as a student's actual results.
    return (
        <Box mih="100vh" bg="#f0f6f4" p="48px 40px">
            <Header />
            <Box component="main" pt="24px">
                <Title order={2}>作答摘要暫未提供</Title>
                <Text mt="md">
                    此版本尚未串接正式作答結果，無法顯示分數、詳解或完成紀錄。
                </Text>
                <Button mt="lg" onClick={() => navigate("/courses/library")}>
                    返回書櫃
                </Button>
            </Box>
        </Box>
    );
}
