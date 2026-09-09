import { useEffect, useState } from "react";
import {
    ActionIcon,
    Badge,
    Button,
    Card,
    SegmentedControl,
    Select,
    Slider,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Pause, Play, RotateCcw } from "lucide-react";

import { listCoursePointerSamples } from "./answerRecordsRepository";
import type { AnswerAttempt, PointerRegion, PointerSample } from "./types";
import styles from "../pages/AnswerRecords.module.css";

type DisplayMode = "trajectory" | "heatmap";
type HeatmapScope = "personal" | "course";

const regionLabels: Record<PointerRegion, string> = {
    material: "教材文字",
    media: "教材圖片",
    question: "題目區",
    chat: "LLM 對話區",
};

function formatElapsed(milliseconds: number) {
    const seconds = Math.floor(milliseconds / 1_000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function regionSummary(samples: PointerSample[]) {
    const total = Math.max(1, samples.length);
    return (Object.keys(regionLabels) as PointerRegion[]).map((region) => {
        const count = samples.filter(
            (sample) => sample.region === region
        ).length;
        return { region, percentage: Math.round((count / total) * 100) };
    });
}

export default function PointerInteractionPanel({
    attempt,
}: {
    attempt: AnswerAttempt;
}) {
    const [pageIndex, setPageIndex] = useState(1);
    const [mode, setMode] = useState<DisplayMode>("trajectory");
    const [scope, setScope] = useState<HeatmapScope>("personal");
    const [currentTime, setCurrentTime] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState("1");
    const session = attempt.pointerSessions.find(
        (candidate) => candidate.pageIndex === pageIndex
    );
    const duration = session?.durationMs ?? 0;
    const courseSamplesQuery = useQuery({
        queryKey: ["admin", "pointer-samples", attempt.courseId, pageIndex],
        queryFn: () => listCoursePointerSamples(attempt.courseId, pageIndex),
        enabled: mode === "heatmap" && scope === "course",
    });

    useEffect(() => {
        if (!playing || !duration) return;
        const interval = window.setInterval(() => {
            setCurrentTime((value) => {
                const next = value + 100 * Number(speed);
                if (next >= duration) {
                    setPlaying(false);
                    return duration;
                }
                return next;
            });
        }, 100);
        return () => window.clearInterval(interval);
    }, [duration, playing, speed]);

    const personalSamples = session?.samples ?? [];
    const trajectorySamples = personalSamples.filter(
        (sample) => sample.elapsedMs <= currentTime
    );
    const heatmapSamples =
        scope === "course" ? (courseSamplesQuery.data ?? []) : personalSamples;
    const summarySamples =
        mode === "heatmap" ? heatmapSamples : personalSamples;
    const summary = regionSummary(summarySamples);
    const activeQuestion = attempt.questions.find(
        (question) => question.pageIndex === pageIndex
    );
    const pageTitle = activeQuestion?.pageTitle ?? `教材第 ${pageIndex} 頁`;
    const visiblePath = trajectorySamples
        .map((sample) => `${sample.xRatio * 1000},${sample.yRatio * 600}`)
        .join(" ");
    const cursor = trajectorySamples.at(-1);

    return (
        <div className={styles.interactionLayout}>
            <Card className={styles.interactionCard} radius="lg">
                <div className={styles.interactionToolbar}>
                    <div>
                        <strong>教材頁面互動預覽</strong>
                        <small>座標依原始 1440 × 900 viewport 等比例呈現</small>
                    </div>
                    <SegmentedControl
                        aria-label="滑鼠紀錄顯示模式"
                        value={mode}
                        onChange={(value) => {
                            setMode(value as DisplayMode);
                            setCurrentTime(0);
                            setPlaying(false);
                        }}
                        data={[
                            { value: "trajectory", label: "軌跡回放" },
                            { value: "heatmap", label: "熱區圖" },
                        ]}
                    />
                </div>

                <div className={styles.pageSelector} aria-label="選擇教材頁面">
                    {Array.from(
                        { length: attempt.coursePageCount },
                        (_, index) => {
                            const page = index + 1;
                            const hasRecord = attempt.pointerSessions.some(
                                (item) => item.pageIndex === page
                            );
                            return (
                                <Button
                                    key={page}
                                    size="compact-sm"
                                    variant={
                                        pageIndex === page ? "filled" : "light"
                                    }
                                    color={hasRecord ? "teal" : "gray"}
                                    onClick={() => {
                                        setPageIndex(page);
                                        setCurrentTime(0);
                                        setPlaying(false);
                                    }}
                                >
                                    {String(page).padStart(2, "0")}
                                </Button>
                            );
                        }
                    )}
                    {mode === "heatmap" && (
                        <SegmentedControl
                            className={styles.scopeControl}
                            size="xs"
                            aria-label="熱區資料範圍"
                            value={scope}
                            onChange={(value) =>
                                setScope(value as HeatmapScope)
                            }
                            data={[
                                { value: "personal", label: "這次作答" },
                                { value: "course", label: "同教材全體" },
                            ]}
                        />
                    )}
                </div>

                {!session ? (
                    <div className={styles.noPointerData}>
                        <span>此頁沒有滑鼠紀錄</span>
                        <small>學生尚未進入這一頁，因此不產生模擬軌跡。</small>
                    </div>
                ) : (
                    <>
                        <div
                            className={styles.coursePreview}
                            aria-label={`${pageTitle}唯讀預覽`}
                        >
                            <div className={styles.previewNav}>
                                <strong>{attempt.courseTitle}</strong>
                                <span>
                                    教材頁面{" "}
                                    {String(pageIndex).padStart(2, "0")}
                                </span>
                            </div>
                            <div className={styles.previewBody}>
                                <section className={styles.previewMaterial}>
                                    <div className={styles.previewMedia}>
                                        教材圖片
                                    </div>
                                    <div className={styles.previewText}>
                                        <strong>{pageTitle}</strong>
                                        <span>教材文字與科學說明</span>
                                    </div>
                                    <div className={styles.previewQuestion}>
                                        <strong>題目</strong>
                                        <span>
                                            {activeQuestion?.questionContent ??
                                                "本頁教材問題"}
                                        </span>
                                    </div>
                                </section>
                                <aside className={styles.previewChat}>
                                    <strong>LLM 對話</strong>
                                    <span>教材問答與提示</span>
                                </aside>
                            </div>

                            {mode === "trajectory" ? (
                                <svg
                                    className={styles.trajectoryOverlay}
                                    viewBox="0 0 1000 600"
                                    preserveAspectRatio="none"
                                    aria-hidden="true"
                                >
                                    {visiblePath && (
                                        <polyline
                                            points={visiblePath}
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    )}
                                    {cursor && (
                                        <circle
                                            cx={cursor.xRatio * 1000}
                                            cy={cursor.yRatio * 600}
                                            r="12"
                                            fill="currentColor"
                                            stroke="white"
                                            strokeWidth="5"
                                        />
                                    )}
                                </svg>
                            ) : (
                                <div
                                    className={styles.heatmapOverlay}
                                    aria-hidden="true"
                                >
                                    {heatmapSamples.map((sample, index) => (
                                        <span
                                            key={`${sample.elapsedMs}-${index}`}
                                            className={styles.heatDot}
                                            style={{
                                                left: `${sample.xRatio * 100}%`,
                                                top: `${sample.yRatio * 100}%`,
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {mode === "trajectory" && (
                            <div className={styles.playbackControls}>
                                <ActionIcon
                                    size="lg"
                                    color="teal"
                                    aria-label={
                                        playing ? "暫停軌跡" : "播放軌跡"
                                    }
                                    onClick={() => {
                                        if (currentTime >= duration)
                                            setCurrentTime(0);
                                        setPlaying((value) => !value);
                                    }}
                                >
                                    {playing ? (
                                        <Pause size={18} />
                                    ) : (
                                        <Play size={18} />
                                    )}
                                </ActionIcon>
                                <ActionIcon
                                    size="lg"
                                    variant="light"
                                    color="teal"
                                    aria-label="重新播放"
                                    onClick={() => {
                                        setCurrentTime(0);
                                        setPlaying(false);
                                    }}
                                >
                                    <RotateCcw size={17} />
                                </ActionIcon>
                                <span>{formatElapsed(currentTime)}</span>
                                <Slider
                                    className={styles.timeline}
                                    aria-label="軌跡播放時間"
                                    min={0}
                                    max={duration}
                                    step={100}
                                    value={currentTime}
                                    label={(value) => formatElapsed(value)}
                                    onChange={(value) => {
                                        setPlaying(false);
                                        setCurrentTime(value);
                                    }}
                                    color="teal"
                                />
                                <span>{formatElapsed(duration)}</span>
                                <Select
                                    className={styles.speedSelect}
                                    aria-label="播放速度"
                                    value={speed}
                                    onChange={(value) => setSpeed(value ?? "1")}
                                    data={[
                                        { value: "0.5", label: "0.5×" },
                                        { value: "1", label: "1×" },
                                        { value: "2", label: "2×" },
                                    ]}
                                    allowDeselect={false}
                                />
                            </div>
                        )}
                    </>
                )}
            </Card>

            <Card className={styles.dwellCard} radius="lg">
                <div className={styles.dwellHeader}>
                    <div>
                        <strong>區域停留摘要</strong>
                        <small>
                            {mode === "heatmap" && scope === "course"
                                ? "同教材學生聚合"
                                : "目前這次作答"}
                        </small>
                    </div>
                    <Badge variant="light" color="teal">
                        第 {pageIndex} 頁
                    </Badge>
                </div>
                {summarySamples.length === 0 ? (
                    <p className={styles.emptySummary}>沒有可計算的紀錄</p>
                ) : (
                    <div className={styles.dwellList}>
                        {summary.map(({ region, percentage }) => (
                            <div key={region} className={styles.dwellRow}>
                                <span>
                                    <strong>{regionLabels[region]}</strong>
                                    <small>{percentage}%</small>
                                </span>
                                <div className={styles.dwellTrack}>
                                    <i style={{ width: `${percentage}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div className={styles.privacyNote}>
                    Demo
                    僅呈現座標、時間與頁碼，不包含答案、輸入內容或對話文字。
                </div>
            </Card>
        </div>
    );
}
