// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AnswerResultBadge from "./AnswerResultBadge";

describe("AnswerResultBadge", () => {
    it("shows loading, request errors, and unavailable answer IDs distinctly", () => {
        const { rerender } = render(<AnswerResultBadge isLoading />);
        expect(screen.getByText("評分載入中")).toBeTruthy();

        rerender(<AnswerResultBadge isError />);
        expect(screen.getByText("評分載入失敗")).toBeTruthy();

        rerender(<AnswerResultBadge isUnavailable />);
        expect(screen.getByText("無法取得評分")).toBeTruthy();

        rerender(<AnswerResultBadge />);
        expect(screen.getByText("未作答")).toBeTruthy();
    });

    it("respects hidden and pending result states from the API", () => {
        const { rerender } = render(
            <AnswerResultBadge
                result={{
                    answerId: "answer-1",
                    questionId: "question-1",
                    status: "PENDING",
                    resultVisible: true,
                }}
            />
        );
        expect(screen.getByText("待批改")).toBeTruthy();

        rerender(
            <AnswerResultBadge
                result={{
                    answerId: "answer-1",
                    questionId: "question-1",
                    status: "GRADED",
                    resultVisible: false,
                }}
            />
        );
        expect(screen.getByText("成績未公開")).toBeTruthy();
    });
});
