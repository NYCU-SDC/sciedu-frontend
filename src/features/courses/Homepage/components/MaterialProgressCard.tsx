import { Card, Text, Title } from "@mantine/core";
import {
    getMaterialProgressLabel,
    type MaterialStatus,
} from "../../materialProgress";

export type MaterialListItem = {
    id: string;
    title: string;
    totalPages: number;
    completedPage: number;
    status: MaterialStatus;
};

const statusLabel: Record<MaterialStatus, string> = {
    done: "已完成",
    in_progress: "進行中",
    not_started: "未完成",
};

// 設計稿標示的字體是 'GenYoGothic2 TW'，
// 但實際掛載進來的字體名稱是 GenYoGothicTW（沒有「2」也沒有空格）
const FONT_FAMILY = '"GenYoGothicTW", sans-serif';

const statusColor: Record<MaterialStatus, string> = {
    done: "#00856e",
    in_progress: "#925800",
    not_started: "var(--color-neutral-600)",
};

type Props = {
    items: MaterialListItem[];
};

export default function MaterialProgressCard({ items }: Props) {
    const doneCount = items.filter((item) => item.status === "done").length;

    return (
        <Card
            radius="16px"
            mih={{ base: "auto", md: "448px" }}
            style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                padding: "27px 45px",
                backgroundColor: "#ffffff",
                border: "1px solid #d4d4d4",
                boxShadow: "0px 16px 40px rgba(44, 79, 71, 0.08)",
                fontFamily: FONT_FAMILY,
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <Title
                    order={3}
                    fz="24px"
                    lh="32px"
                    fw={700}
                    ff={FONT_FAMILY}
                    c="var(--color-brand-teal-dark)"
                >
                    今日教材
                </Title>
                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "41px",
                        padding: "6px 12px",
                        borderRadius: "32px",
                        backgroundColor: "rgba(0, 95, 85, 0.25)",
                        border: "1px solid #004038",
                        color: "#004038",
                        fontSize: "20px",
                        fontWeight: 500,
                        lineHeight: "27px",
                    }}
                >
                    {doneCount}/{items.length} 完成
                </div>
            </div>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                }}
            >
                {items.map((item) => {
                    const status = item.status;
                    return (
                        <div
                            key={item.id}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                flexWrap: "nowrap",
                                gap: "10px",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.125rem",
                                    flex: 1,
                                    minWidth: 0,
                                }}
                            >
                                <Text
                                    fz="20px"
                                    lh="27px"
                                    fw={500}
                                    ff={FONT_FAMILY}
                                    c="#000000"
                                >
                                    {item.title}
                                </Text>
                                <Text
                                    fz="12px"
                                    lh="16px"
                                    ff={FONT_FAMILY}
                                    c="var(--color-neutral-600)"
                                >
                                    {getMaterialProgressLabel(item)}
                                </Text>
                            </div>
                            <Text
                                fz="14px"
                                lh="19px"
                                fw={400}
                                ff={FONT_FAMILY}
                                c={statusColor[status]}
                                style={{ whiteSpace: "nowrap", flexShrink: 0 }}
                            >
                                {statusLabel[status]}
                            </Text>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}
