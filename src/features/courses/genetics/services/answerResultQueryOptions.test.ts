// @vitest-environment jsdom
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { answerResultQueryOptions } from "./answerResultQueryOptions";
import { fetchAnswerResult } from "./fetchAnswerResult";
vi.mock("./fetchAnswerResult", () => ({ fetchAnswerResult: vi.fn() }));
afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
});
describe("answer result polling", () => {
    it.each(["GRADED", "FAILED"] as const)(
        "refreshes pending results and stops at %s",
        async (status) => {
            vi.useFakeTimers();
            vi.mocked(fetchAnswerResult)
                .mockResolvedValueOnce({
                    answerId: "a1",
                    questionId: "q1",
                    status: "PENDING",
                    resultVisible: false,
                })
                .mockResolvedValue({
                    answerId: "a1",
                    questionId: "q1",
                    status,
                    resultVisible: true,
                });
            const client = new QueryClient({
                defaultOptions: { queries: { retry: false } },
            });
            const observer = new QueryObserver(
                client,
                answerResultQueryOptions("student@example.test", "q1", "a1")
            );
            const unsubscribe = observer.subscribe(() => {});
            try {
                await vi.advanceTimersByTimeAsync(1);
                expect(observer.getCurrentResult().data?.status).toBe(
                    "PENDING"
                );
                await vi.advanceTimersByTimeAsync(2000);
                expect(observer.getCurrentResult().data?.status).toBe(status);
                await vi.advanceTimersByTimeAsync(6000);
                expect(fetchAnswerResult).toHaveBeenCalledTimes(2);
            } finally {
                unsubscribe();
                client.clear();
            }
        }
    );
    it("isolates result caches between students", () => {
        const client = new QueryClient();
        client.setQueryData(
            answerResultQueryOptions("first@example.test", "q1", "a1").queryKey,
            {
                answerId: "a1",
                questionId: "q1",
                status: "GRADED",
                resultVisible: true,
            }
        );
        expect(
            client.getQueryData(
                answerResultQueryOptions("second@example.test", "q1", "a1")
                    .queryKey
            )
        ).toBeUndefined();
        expect(answerResultQueryOptions("", "q1", "a1").enabled).toBe(false);
        client.clear();
    });
});
