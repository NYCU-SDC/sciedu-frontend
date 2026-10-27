import type {
    CourseAnswers,
    CourseDefinition,
    SubmittedAnswerResponse,
} from "../genetics/types/types";
import type { AnswerReference } from "./presentation";
export type AnswerRow = { label: string; answer: string; status: string };
export function resolveAnswerReferences(
    refs: AnswerReference[],
    definition: CourseDefinition,
    answers: Record<number, CourseAnswers>,
    submissions: SubmittedAnswerResponse[],
    experimentId?: string,
    practice = false
): AnswerRow[] {
    return refs.map((ref) => {
        const page = definition.pages.find(
            (p) => p.pageIndex === ref.pageIndex
        );
        const section =
            page?.request.type === "material"
                ? page.request.questionSections[ref.questionIndex]
                : undefined;
        if (!section) throw new Error("教材回答表格引用了不存在的題目");
        const submitted = submissions.find(
            (a) =>
                a.questionId === section.questionId &&
                a.experimentId === experimentId
        );
        const draft = answers[ref.pageIndex]?.[section.questionId];
        return {
            label: ref.label,
            answer: submitted?.textAnswer ?? draft ?? "尚未取得本次回答",
            status: submitted
                ? "已確認提交"
                : draft
                  ? practice
                      ? "本機練習答案"
                      : "本次紀錄（提交狀態未確認）"
                  : "尚未取得",
        };
    });
}
