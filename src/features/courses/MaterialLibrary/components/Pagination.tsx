import { ArrowLeft, ArrowRight } from "lucide-react";
import { ActionIcon, Group, Text } from "@mantine/core";

// Pagination 從父元件接收的資料
type Props = {
    // 目前頁碼
    page: number;

    // 總共有幾頁
    pageCount: number;

    // 使用者點「上一頁」時要通知父元件做的事
    // （實際把 page 減 1 的邏輯在父元件）
    onPrev: () => void;

    // 使用者點「下一頁」時要通知父元件做的事
    onNext: () => void;
};

export default function Pagination({ page, pageCount, onPrev, onNext }: Props) {
    return (
        // 左：上一頁按鈕／中：頁碼文字／右：下一頁按鈕，置中排列
        <Group justify="center" gap="1rem" mt="2rem">
            {/* 上一頁按鈕 */}
            <ActionIcon
                variant="default"
                radius="xl"
                size="2.25rem"
                // 點擊時只呼叫父元件傳進來的回呼，
                // 自己不記錄、不修改頁碼
                onClick={onPrev}
                // 已經在第一頁就不能再往前
                disabled={page <= 1}
                aria-label="上一頁"
            >
                <ArrowLeft size={16} />
            </ActionIcon>

            {/* 目前頁 / 總頁數 */}
            <Text
                fz="0.875rem"
                fw={600}
                c="dark.7"
                style={{ minWidth: "2.5rem", textAlign: "center" }}
            >
                {page} / {pageCount}
            </Text>

            {/* 下一頁按鈕 */}
            <ActionIcon
                variant="default"
                radius="xl"
                size="2.25rem"
                onClick={onNext}
                // 已經在最後一頁就不能再往後
                disabled={page >= pageCount}
                aria-label="下一頁"
            >
                <ArrowRight size={16} />
            </ActionIcon>
        </Group>
    );
}
