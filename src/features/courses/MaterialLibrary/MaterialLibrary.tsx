import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";
import {
    Box,
    Button,
    Group,
    SimpleGrid,
    Stack,
    Text,
    Title,
} from "@mantine/core";
import Header from "./components/Header";
import FilterBar, {
    type ProgressFilter,
    type RangeFilter,
} from "./components/FilterBar";
import MaterialCard, { type MaterialStatus } from "./components/MaterialCard";
import Pagination from "./components/Pagination";

// 書櫃單一教材的資料結構
type LibraryMaterialItem = {
    id: string;
    title: string;
    subject: string;
    totalPages: number;
    completedPage: number;
    status: MaterialStatus;

    // 是否為「今日教材」，供「範圍」篩選使用
    isToday: boolean;
};

// 課程資料
const materials: LibraryMaterialItem[] = [
    {
        id: "pea-seed-coat-1",
        title: "碗豆－種皮形狀",
        subject: "遺傳學",
        totalPages: 3,
        completedPage: 3,
        status: "done",
        isToday: true,
    },
    {
        id: "pea-seed-coat-2",
        title: "碗豆－種皮形狀",
        subject: "遺傳學",
        totalPages: 3,
        completedPage: 3,
        status: "done",
        isToday: true,
    },
    {
        id: "pea-seed-coat-3",
        title: "碗豆－種皮形狀",
        subject: "遺傳學",
        totalPages: 3,
        completedPage: 1,
        status: "in_progress",
        isToday: true,
    },
    {
        id: "pea-seed-coat-4",
        title: "碗豆－種皮形狀",
        subject: "遺傳學",
        totalPages: 3,
        completedPage: 1,
        status: "in_progress",
        isToday: false,
    },
    {
        id: "pea-seed-coat-5",
        title: "碗豆－種皮形狀",
        subject: "遺傳學",
        totalPages: 3,
        completedPage: 0,
        status: "not_started",
        isToday: false,
    },
    {
        id: "pea-seed-coat-6",
        title: "碗豆－種皮形狀",
        subject: "細胞學",
        totalPages: 3,
        completedPage: 0,
        status: "not_started",
        isToday: false,
    },
    {
        id: "pea-seed-coat-7",
        title: "碗豆－種皮形狀",
        subject: "細胞學",
        totalPages: 3,
        completedPage: 0,
        status: "not_started",
        isToday: false,
    },
    {
        id: "pea-seed-coat-8",
        title: "碗豆－種皮形狀",
        subject: "細胞學",
        totalPages: 3,
        completedPage: 1,
        status: "in_progress",
        isToday: false,
    },
];

// 從教材資料中萃取出不重複的「科目清單」，給 FilterBar.tsx 下拉選單用
const subjectOptions = Array.from(
    new Set(materials.map((item) => item.subject))
);

// 每頁顯示幾張教材卡片
const PAGE_SIZE = 6;

// 設計稿標示的字體是 'GenYoGothic2 TW'，
// 但實際掛載進來的字體名稱是 GenYoGothicTW（沒有「2」也沒有空格）
const FONT_FAMILY = '"GenYoGothicTW", sans-serif';

export default function MaterialLibrary() {
    const navigate = useNavigate();

    // 三種篩選條件 + 目前頁碼，後續透過 props 傳給 FilterBar / Pagination components
    const [range, setRange] = useState<RangeFilter>("all");
    const [subject, setSubject] = useState("all");
    const [progress, setProgress] = useState<ProgressFilter>("all");
    const [page, setPage] = useState(1);

    // 依目前的範圍／科目／進度條件篩選教材，用 useMemo 快取結果，避免每次 render 都重新計算
    const filteredMaterials = useMemo(() => {
        return materials.filter((item) => {
            if (range === "today" && !item.isToday) return false;
            if (subject !== "all" && item.subject !== subject) return false;
            if (progress === "done" && item.status !== "done") return false;
            if (progress === "not_done" && item.status === "done") return false;
            return true;
        });
    }, [range, subject, progress]);

    // 依篩選後的筆數計算總頁數；篩選不到任何資料時為 0 頁
    const pageCount =
        filteredMaterials.length === 0
            ? 0
            : Math.ceil(filteredMaterials.length / PAGE_SIZE);

    // 避免篩選後資料變少、頁碼超出範圍；0 頁時目前頁碼也是 0
    const currentPage = pageCount === 0 ? 0 : Math.min(page, pageCount);

    // 切出目前這一頁要顯示的教材
    const pageMaterials = filteredMaterials.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    return (
        <Box
            mih="100vh"
            bg="#eef3f1"
            p="48px 40px"
            style={{ display: "flex", flexDirection: "column" }}
        >
            {/* 頁首，純展示、不吃 props */}
            <Header />

            <Box component="main" pt="16px" pb="3rem">
                {/* === 頁面標題 + 返回按鈕 === */}
                <Group justify="space-between" align="center" p="10px">
                    <Stack gap="10px">
                        <Title
                            order={2}
                            fz="32px"
                            lh="43px"
                            fw={700}
                            c="brandTeal.8"
                        >
                            教材書櫃
                        </Title>
                        <Text fz="14px" lh="19px" c="var(--color-neutral-600)">
                            所有教材總覽
                        </Text>
                    </Stack>
                    <Button
                        variant="default"
                        leftSection={<ArrowLeft size={24} color="#004038" />}
                        onClick={() => navigate("/courses")}
                        styles={{
                            root: {
                                height: "53px",
                                padding: "12px 18px",
                                backgroundColor: "#ffffff",
                                border: "1px solid #d4d4d4",
                                borderRadius: "16px",
                                boxShadow:
                                    "0px 16px 40px rgba(44, 79, 71, 0.08)",
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
                        返回今日任務
                    </Button>
                </Group>

                {/* 跟 Homepage 的 Library 一樣，用自己的 padding-top
                    (16px) 疊出跟標題列之間的距離，
                    不用外部 margin 硬湊 */}
                <Box pt="16px">
                    {/* === 篩選列 ===*/}
                    {/* 只傳目前的值和 onChange 回呼，
                    FilterBar 本身不存篩選狀態 */}
                    <FilterBar
                        range={range}
                        onRangeChange={(value) => {
                            // 更新「範圍」篩選條件，頁數調整回第一頁
                            setRange(value);
                            setPage(1);
                        }}
                        subject={subject}
                        subjectOptions={subjectOptions}
                        onSubjectChange={(value) => {
                            setSubject(value);
                            setPage(1);
                        }}
                        progress={progress}
                        onProgressChange={(value) => {
                            setProgress(value);
                            setPage(1);
                        }}
                        resultCount={filteredMaterials.length}
                    />

                    {/* === 教材卡片列表 / 查無資料時顯示 empty state === */}
                    {/* 最小高度依斷點調整，避免筆數變少時 Pagination 跳動：
                    手機（base）只有 1 欄，保留 1 排卡片高度即可，
                    保留到 2 排會在小螢幕留下太多空白；
                    平板／桌機（sm 以上）保留 2 排卡片高度 */}
                    {filteredMaterials.length === 0 ? (
                        <Box
                            mih={{ base: "200px", sm: "409px" }}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "0.5rem",
                            }}
                        >
                            <Title
                                order={3}
                                fz="1.25rem"
                                fw={700}
                                c="brandTeal.8"
                            >
                                查無對應教材
                            </Title>
                            <Text fz="0.875rem" c="dimmed">
                                請調整篩選跳條件後再試一次
                            </Text>
                        </Box>
                    ) : (
                        <SimpleGrid
                            cols={{ base: 1, sm: 2, lg: 3 }}
                            spacing="1.5rem"
                            mih={{ base: "200px", sm: "409px" }}
                        >
                            {pageMaterials.map((item) => (
                                <MaterialCard
                                    key={item.id}
                                    title={item.title}
                                    totalPages={item.totalPages}
                                    completedPage={item.completedPage}
                                    status={item.status}
                                    onContinue={() =>
                                        navigate("/courses/summary")
                                    }
                                />
                            ))}
                        </SimpleGrid>
                    )}

                    {/* === 分頁控制 === */}
                    <Pagination
                        page={currentPage}
                        pageCount={pageCount}
                        // 頁碼上下限交給這裡的 setPage 控管，
                        // Pagination 本身只負責顯示與觸發
                        onPrev={() => setPage((prev) => Math.max(1, prev - 1))}
                        onNext={() =>
                            setPage((prev) => Math.min(pageCount, prev + 1))
                        }
                    />
                </Box>
            </Box>
        </Box>
    );
}
