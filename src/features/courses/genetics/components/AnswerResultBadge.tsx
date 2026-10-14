import type { AnswerResultResponse } from "../types/types";
import styles from "./AnswerResultBadge.module.css";

type Props = {
    result?: AnswerResultResponse;
    isLoading?: boolean;
    isError?: boolean;
    isUnavailable?: boolean;
};

export default function AnswerResultBadge({
    result,
    isLoading = false,
    isError = false,
    isUnavailable = false,
}: Props) {
    let label = "未作答";
    let tone = styles.neutral;

    if (isLoading) {
        label = "評分載入中";
    } else if (isError) {
        label = "評分載入失敗";
        tone = styles.warning;
    } else if (isUnavailable) {
        label = "無法取得評分";
        tone = styles.warning;
    } else if (result?.status === "PENDING") {
        label = "待批改";
        tone = styles.pending;
    } else if (result?.status === "FAILED") {
        label = "評分失敗";
        tone = styles.warning;
    } else if (result?.status === "GRADED" && !result.resultVisible) {
        label = "成績未公開";
        tone = styles.pending;
    } else if (result?.isCorrect === true) {
        label = "答對";
        tone = styles.correct;
    } else if (result?.isCorrect === false) {
        label = "答錯";
        tone = styles.wrong;
    }

    return <span className={`${styles.badge} ${tone}`}>{label}</span>;
}
