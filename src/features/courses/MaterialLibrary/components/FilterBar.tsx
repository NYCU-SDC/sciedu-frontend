import { Group, Select, SegmentedControl, Text } from "@mantine/core";

// 教材範圍
export type RangeFilter = "today" | "all";

// 進度條範圍-全部、未完成、已完成
export type ProgressFilter = "all" | "not_done" | "done";

// 今日/全部教材範圍選項
const rangeOptions = [
    { label: "今日教材", value: "today" },
    { label: "全部教材", value: "all" },
];

// 進度選項
const progressOptions = [
    { label: "全部", value: "all" },
    { label: "未完成", value: "not_done" },
    { label: "已完成", value: "done" },
];

// FilterBar 從父元件接收的資料
type Props = {
    // 目前選擇的教材
    range: RangeFilter;

    // 當範圍改變時，通知父元件
    onRangeChange: (value: RangeFilter) => void;

    // 目前選擇的科目
    subject: string;

    // 可以選擇的科目清單
    subjectOptions: string[];

    // 當科目改變時，通知父元件
    onSubjectChange: (value: string) => void;

    // 目前選擇的進度
    progress: ProgressFilter;

    // 當進度改變時，通知父元件
    onProgressChange: (value: ProgressFilter) => void;

    // 篩選後剩下多少份教材
    resultCount: number;
};

export default function FilterBar({
    range,
    onRangeChange,
    subject,
    subjectOptions,
    onSubjectChange,
    progress,
    onProgressChange,
    resultCount,
}: Props) {
    return (
        // 整個 FilterBar 的最外層容器
        <Group
            wrap="wrap"
            gap="1.5rem"
            bg="white"
            p="0.875rem 1.5rem"
            mb="1.5rem"
            style={{
                borderRadius: "1rem",
                boxShadow: "0 1px 2px rgba(15, 23, 43, 0.06)",
            }}
        >
            {/* === 範圍篩選器邏輯 === */}
            <Group gap="0.75rem" wrap="nowrap">
                {/* 篩選文字設定 */}
                <Text size="xs" fw={600} c="dimmed">
                    範圍
                </Text>

                {/* 選單按鈕－今日教材/全部教材 */}
                <SegmentedControl
                    size="xs"
                    radius="xl"
                    color="brandTeal"
                    value={range}
                    onChange={(
                        value // 使用者切換選項時，將新的值傳回父元件
                    ) => onRangeChange(value as RangeFilter)}
                    data={rangeOptions}
                />
            </Group>

            {/* ===科目篩選 === */}
            <Group gap="0.75rem" wrap="nowrap">
                <Text size="xs" fw={600} c="dimmed">
                    科目
                </Text>

                <Select
                    size="xs"
                    radius="xl"
                    w="9rem"
                    // Select 一定有值
                    allowDeselect={false}
                    value={subject}
                    // 使用者選擇新的科目時，將新值傳回父元件
                    onChange={(value) => onSubjectChange(value ?? "all")}
                    // 第一個固定是「全部科目」及加入其他科目選項
                    data={[
                        { value: "all", label: "全部科目" },
                        ...subjectOptions,
                    ]}
                />
            </Group>

            {/* === 進度篩選 === */}
            <Group gap="0.75rem" wrap="nowrap">
                <Text size="xs" fw={600} c="dimmed">
                    進度
                </Text>

                {/* 全部 / 未完成 / 已完成 */}
                <SegmentedControl
                    size="xs"
                    radius="xl"
                    color="brandTeal"
                    // 目前選擇的進度
                    value={progress}
                    // 使用者切換進度後，將新的值通知父元件
                    onChange={(value) =>
                        onProgressChange(value as ProgressFilter)
                    }
                    data={progressOptions}
                />
            </Group>

            {/*=== 篩選結果數量 === */}
            <Text size="xs" c="dimmed" ml="auto">
                共篩選出 {resultCount} 份教材
            </Text>
        </Group>
    );
}
