import type { ReactNode } from "react";
import { ArrowRight, Clock3 } from "lucide-react";
import { Button, Text, Title } from "@mantine/core";

// 設計稿標示的字體是 'GenYoGothic2 TW'，
// 但實際掛載進來的字體名稱是 GenYoGothicTW（沒有「2」也沒有空格）
const FONT_FAMILY = '"GenYoGothicTW", sans-serif';

// 分數摘要單一列（答對／答錯／作答時間），
// 左邊是圓點或圖示 + 標籤，右邊靠右對齊數值
function ScoreRow({
    icon,
    label,
    value,
}: {
    icon: ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                }}
            >
                {icon}
                <Text fz="16px" lh="21px" ff={FONT_FAMILY} c="#000000">
                    {label}
                </Text>
            </div>
            <Text fz="16px" lh="21px" ff={FONT_FAMILY} c="#000000">
                {value}
            </Text>
        </div>
    );
}

function StatusDot({ color }: { color: string }) {
    return (
        <div
            style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                backgroundColor: color,
                flexShrink: 0,
            }}
        />
    );
}

type Props = {
    title: string;
    materialTitle: string;
    description: string;
    correctCount: number;
    wrongCount: number;
    duration: string;
    onDetailClick?: () => void;
};

export default function ResultCard({
    title,
    materialTitle,
    description,
    correctCount,
    wrongCount,
    duration,
    onDetailClick,
}: Props) {
    return (
        <div
            style={{
                boxSizing: "border-box",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 48px",
                gap: "32px",
                backgroundColor: "#ffffff",
                border: "1px solid #d4d4d4",
                boxShadow: "0px 16px 40px rgba(44, 79, 71, 0.08)",
                borderRadius: "16px",
                minHeight: "672px",
            }}
        >
            {/* LeftGroup：標題、教材名稱、說明、按鈕 */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "flex-start",
                    gap: "16px",
                    flex: "1 1 400px",
                }}
            >
                <Title
                    order={1}
                    fz="40px"
                    lh="53px"
                    fw={700}
                    ff={FONT_FAMILY}
                    c="#000000"
                >
                    {title}
                </Title>
                <Title
                    order={2}
                    fz="32px"
                    lh="43px"
                    fw={700}
                    ff={FONT_FAMILY}
                    c="var(--color-brand-teal-dark)"
                >
                    {materialTitle}
                </Title>
                <Text fz="16px" lh="21px" ff={FONT_FAMILY} c="#525252">
                    {description}
                </Text>
                <div style={{ padding: "10px 0" }}>
                    <Button
                        radius="16px"
                        rightSection={<ArrowRight size={24} color="#ffffff" />}
                        onClick={onDetailClick}
                        styles={{
                            root: {
                                width: "164px",
                                height: "48px",
                                padding: "12px 18px",
                                backgroundColor: "#005f55",
                                border: "none",
                            },
                            label: {
                                fontFamily: FONT_FAMILY,
                                fontSize: "16px",
                                fontWeight: 400,
                                lineHeight: "21px",
                                color: "#ffffff",
                                whiteSpace: "nowrap",
                            },
                            section: {
                                marginInlineStart: "8px",
                            },
                        }}
                    >
                        詳細作答情況
                    </Button>
                </div>
            </div>

            {/* RightGroup：淺灰底的分數摘要面板 */}
            <div
                style={{
                    boxSizing: "border-box",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flex: "1 1 320px",
                    maxWidth: "547px",
                    minHeight: "235px",
                    backgroundColor: "#f5f5f5",
                    borderRadius: "16px",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: "16px",
                        padding: "10px",
                        width: "334px",
                        maxWidth: "100%",
                    }}
                >
                    <ScoreRow
                        icon={<StatusDot color="#00856e" />}
                        label="答對"
                        value={`${correctCount} 題`}
                    />
                    <ScoreRow
                        icon={<StatusDot color="#925800" />}
                        label="答錯"
                        value={`${wrongCount} 題`}
                    />
                    <ScoreRow
                        icon={<Clock3 size={16} color="#000000" />}
                        label="作答時間"
                        value={duration}
                    />
                </div>
            </div>
        </div>
    );
}
