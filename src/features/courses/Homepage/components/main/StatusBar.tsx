import { ArrowRight } from "lucide-react";
import { Button, Text, Title } from "@mantine/core";
import { useNavigate } from "react-router";

// 設計稿標示的字體是 'GenYoGothic2 TW'，
// 但實際掛載進來的字體名稱是 GenYoGothicTW（沒有「2」也沒有空格）
const FONT_FAMILY = '"GenYoGothicTW", sans-serif';

export default function StatusBar() {
    const navigate = useNavigate();

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px",
            }}
        >
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                }}
            >
                <Title order={2} fz="32px" lh="43px" fw={700} c="brandTeal.8">
                    今日任務
                </Title>
                <Text fz="14px" lh="19px" c="var(--color-neutral-600)">
                    請優先完成教師今日安排的教材
                </Text>
            </div>
            <Button
                variant="default"
                rightSection={<ArrowRight size={24} color="#004038" />}
                onClick={() => navigate("/courses/library")}
                styles={{
                    root: {
                        width: "190px",
                        height: "53px",
                        padding: "12px 18px",
                        backgroundColor: "#ffffff",
                        border: "1px solid #d4d4d4",
                        borderRadius: "16px",
                        boxShadow: "0px 16px 40px rgba(44, 79, 71, 0.08)",
                        flexShrink: 0,
                    },
                    label: {
                        fontFamily: FONT_FAMILY,
                        fontSize: "20px",
                        fontWeight: 500,
                        lineHeight: "27px",
                        color: "#004038",
                    },
                    section: {
                        marginInlineStart: "8px",
                    },
                }}
            >
                查看教材書櫃
            </Button>
        </div>
    );
}
