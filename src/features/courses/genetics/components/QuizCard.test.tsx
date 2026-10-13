// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import QuizCard from "./QuizCard";

beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
});

describe("QuizCard review mode", () => {
    it("shows a read-only empty state when review data is unavailable", () => {
        const onAnswerChange = vi.fn();
        render(
            <MantineProvider>
                <QuizCard
                    question={{
                        id: "question-1",
                        title: "題目 1",
                        data: {
                            id: "question-1",
                            type: "TEXT",
                            content: "請說明理由",
                            options: [],
                        },
                    }}
                    isLoading={false}
                    error={null}
                    answer=""
                    onAnswerChange={onAnswerChange}
                    reviewMode
                />
            </MantineProvider>
        );

        expect(screen.getByRole("status").textContent).toContain(
            "尚無作答紀錄"
        );
        expect(screen.queryByRole("textbox")).toBeNull();
        expect(screen.queryByRole("button")).toBeNull();
        expect(onAnswerChange).not.toHaveBeenCalled();
    });
});
