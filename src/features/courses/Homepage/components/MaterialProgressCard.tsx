import { ArrowRight } from "lucide-react";
import { Card, Group, Text, Title, UnstyledButton } from "@mantine/core";

export type MaterialListItem = {
    id: string;
    title: string;
    description?: string;
};

// 設計稿標示的字體是 'GenYoGothic2 TW'，
// 但實際掛載進來的字體名稱是 GenYoGothicTW（沒有「2」也沒有空格）
const FONT_FAMILY = '"GenYoGothicTW", sans-serif';

type Props = {
    items: MaterialListItem[];
    onOpen: (courseId: string) => void;
};

export default function MaterialProgressCard({ items, onOpen }: Props) {
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
                    實驗教材
                </Title>
                <Text c="dimmed" fz="14px">
                    {items.length} 份
                </Text>
            </div>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                }}
            >
                {items.map((item) => {
                    return (
                        <UnstyledButton
                            key={item.id}
                            onClick={() => onOpen(item.id)}
                            aria-label={`開啟教材 ${item.title}`}
                            style={{
                                width: "100%",
                                padding: "8px 0",
                            }}
                        >
                            <Group wrap="nowrap" justify="space-between">
                                <div style={{ minWidth: 0 }}>
                                    <Text
                                        fz="20px"
                                        lh="27px"
                                        fw={500}
                                        ff={FONT_FAMILY}
                                        c="#000000"
                                    >
                                        {item.title}
                                    </Text>
                                    {item.description && (
                                        <Text
                                            fz="12px"
                                            lh="16px"
                                            ff={FONT_FAMILY}
                                            c="var(--color-neutral-600)"
                                            lineClamp={1}
                                        >
                                            {item.description}
                                        </Text>
                                    )}
                                </div>
                                <ArrowRight
                                    size={20}
                                    color="#005f55"
                                    aria-hidden="true"
                                />
                            </Group>
                        </UnstyledButton>
                    );
                })}
            </div>
        </Card>
    );
}
