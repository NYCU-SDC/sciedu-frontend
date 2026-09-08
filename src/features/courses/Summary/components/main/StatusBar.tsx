import { ArrowLeft } from "lucide-react";
import { Button, Text, Title } from "@mantine/core";
import { useNavigate } from "react-router";

const FONT_FAMILY = '"GenYoGothicTW", sans-serif';

export default function StatusBar({ title }: { title: string }) {
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
                <Title
                    order={2}
                    fz="32px"
                    lh="43px"
                    fw={700}
                    ff={FONT_FAMILY}
                    c="brandTeal.8"
                >
                    {title}
                </Title>
                <Text fz="14px" lh="19px" ff={FONT_FAMILY} c="#00856e">
                    已完成
                </Text>
            </div>
            <Button
                variant="default"
                leftSection={<ArrowLeft size={24} color="#004038" />}
                onClick={() => navigate("/courses")}
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
                        marginInlineEnd: "8px",
                    },
                }}
            >
                返回教材首頁
            </Button>
        </div>
    );
}
