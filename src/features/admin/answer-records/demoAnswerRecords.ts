import {
    demoCourses as courseCatalog,
    getDemoQuestion,
} from "../../courses/demo/demoCourseCatalog";
import {
    DEMO_EXPERIMENT_ID,
    demoExperiment,
    demoParticipants,
} from "../data/demoAdminData";
import type {
    AnswerAttempt,
    AnswerEvaluation,
    PointerRegion,
    PointerSample,
    QuestionAttempt,
} from "./types";

type QuestionSeed = {
    pageIndex: number;
    pageTitle: string;
    questionContent: string;
    correctAnswer: string;
    studentAnswer: string;
};

function questionsForCourse(courseIndex: number): QuestionSeed[] {
    const course = courseCatalog[courseIndex];
    const questions: QuestionSeed[] = [];

    course.definition.pages.forEach((page) => {
        const request = page.request;
        const ids =
            request.type === "material"
                ? request.questionSections.map((item) => item.questionId)
                : request.type === "questions"
                  ? request.columns.flatMap((column) =>
                        column.questions.map((item) => item.questionId)
                    )
                  : [];

        ids.forEach((id) => {
            const question = getDemoQuestion(id);
            const review = course.reviews[id];
            if (!question || !review) return;
            questions.push({
                pageIndex: page.pageIndex,
                pageTitle: page.secondaryTitle,
                questionContent: question.content,
                correctAnswer: review.correctAnswer,
                studentAnswer: review.studentAnswer,
            });
        });
    });

    return questions;
}

const pathAnchors: Array<[number, number, PointerRegion]> = [
    [0.12, 0.18, "media"],
    [0.24, 0.25, "media"],
    [0.38, 0.2, "media"],
    [0.17, 0.42, "material"],
    [0.32, 0.48, "material"],
    [0.49, 0.53, "material"],
    [0.25, 0.7, "question"],
    [0.45, 0.77, "question"],
    [0.62, 0.72, "question"],
    [0.8, 0.3, "chat"],
    [0.86, 0.49, "chat"],
    [0.79, 0.7, "chat"],
    [0.53, 0.66, "question"],
    [0.34, 0.58, "material"],
];

function buildPointerSamples(
    pageIndex: number,
    studentIndex: number
): PointerSample[] {
    return pathAnchors.map(([x, y, region], index) => ({
        elapsedMs: index * 1_650,
        pageIndex,
        xRatio: Math.min(
            0.96,
            Math.max(
                0.04,
                x + (((studentIndex + pageIndex + index) % 3) - 1) * 0.025
            )
        ),
        yRatio: Math.min(
            0.93,
            Math.max(0.07, y + (((studentIndex * 2 + index) % 3) - 1) * 0.02)
        ),
        region,
    }));
}

function evaluationFor(
    courseIndex: number,
    questionIndex: number,
    studentIndex: number
): AnswerEvaluation {
    if (courseIndex > 0 && (questionIndex + studentIndex) % 3 === 0) {
        return "PENDING_REVIEW";
    }
    return (questionIndex + studentIndex + courseIndex) % 4 === 1
        ? "INCORRECT"
        : "CORRECT";
}

function buildAttempt(
    attemptIndex: number,
    courseIndex: number,
    studentIndex: number,
    progress: "COMPLETED" | "IN_PROGRESS"
): AnswerAttempt {
    const course = courseCatalog[courseIndex];
    const student = demoParticipants[studentIndex].participant;
    const baseQuestions = questionsForCourse(courseIndex);
    const completedCount =
        progress === "COMPLETED"
            ? baseQuestions.length
            : Math.max(1, baseQuestions.length - 1);
    const startedHour = 9 + attemptIndex;
    const startedAt = `2026-07-${String(8 + attemptIndex).padStart(2, "0")}T${String(startedHour).padStart(2, "0")}:05:00+08:00`;
    const durationMs = (18 + courseIndex * 4 + studentIndex) * 60_000;
    const questions: QuestionAttempt[] = baseQuestions
        .slice(0, completedCount)
        .map((question, questionIndex) => {
            const evaluation = evaluationFor(
                courseIndex,
                questionIndex,
                studentIndex
            );
            return {
                id: `${attemptIndex}-${courseIndex}-${questionIndex}`,
                ...question,
                questionTitle: `題目 ${questionIndex + 1}`,
                studentAnswer:
                    evaluation === "INCORRECT"
                        ? question.studentAnswer === question.correctAnswer
                            ? "我認為只會出現單一結果，因為其中一種因素會完全決定最後表現。"
                            : question.studentAnswer
                        : evaluation === "PENDING_REVIEW"
                          ? "我根據教材中的圖片與文字，認為這項結果仍需要更多證據才能確認，並應考慮研究限制。"
                          : question.correctAnswer,
                evaluation,
                submissionCount: 1 + ((questionIndex + studentIndex) % 3),
                lastSubmittedAt: new Date(
                    new Date(startedAt).getTime() +
                        Math.min(
                            durationMs - 60_000,
                            (9 + questionIndex * 2) * 60_000
                        )
                ).toISOString(),
            };
        });
    const correctCount = questions.filter(
        (question) => question.evaluation === "CORRECT"
    ).length;
    const incorrectCount = questions.filter(
        (question) => question.evaluation === "INCORRECT"
    ).length;
    const pendingReviewCount = questions.filter(
        (question) => question.evaluation === "PENDING_REVIEW"
    ).length;
    const visitedPages =
        progress === "COMPLETED"
            ? course.definition.pages
            : course.definition.pages.slice(0, -1);

    return {
        id: `answer-attempt-${String(attemptIndex + 1).padStart(2, "0")}`,
        experimentId: DEMO_EXPERIMENT_ID,
        experimentName: demoExperiment.name,
        courseId: course.id,
        courseTitle: course.title,
        coursePageCount: course.definition.pages.length,
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        progress,
        courseAttemptNumber: 1 + (studentIndex % 2),
        startedAt,
        submittedAt:
            progress === "COMPLETED"
                ? new Date(
                      new Date(startedAt).getTime() + durationMs
                  ).toISOString()
                : undefined,
        durationMs,
        completedQuestionCount: questions.length,
        totalQuestionCount: baseQuestions.length,
        correctCount,
        incorrectCount,
        pendingReviewCount,
        questions,
        pointerSessions: visitedPages.map((page) => ({
            pageIndex: page.pageIndex,
            viewportWidth: 1440,
            viewportHeight: 900,
            durationMs: 22_000,
            samples: buildPointerSamples(page.pageIndex, studentIndex),
        })),
    };
}

export const demoAnswerAttempts: AnswerAttempt[] = [
    buildAttempt(0, 0, 0, "COMPLETED"),
    buildAttempt(1, 1, 1, "COMPLETED"),
    buildAttempt(2, 2, 2, "COMPLETED"),
    buildAttempt(3, 0, 3, "IN_PROGRESS"),
    buildAttempt(4, 1, 4, "COMPLETED"),
    buildAttempt(5, 2, 5, "IN_PROGRESS"),
    buildAttempt(6, 0, 6, "COMPLETED"),
    buildAttempt(7, 1, 7, "COMPLETED"),
];
