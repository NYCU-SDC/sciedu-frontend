// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StrictMode, type ReactNode } from "react";
import {
    LearningSessionContext,
    type LearningSession,
} from "./LearningSessionContext";
import { useLearningLock } from "./useLearningLock";
import { readPersistent, writePersistent } from "./persistentStorage";
import { useAnswerSubmission } from "../courses/genetics/components/useAnswerSubmission";
import { submitAnswer } from "../courses/genetics/services/submitAnswer";
import { attemptSessionKey } from "../../shared/auth/courseAttemptStorage";
import { ApiError } from "../../shared/utils/api";
vi.mock("../courses/genetics/services/submitAnswer", () => ({
    submitAnswer: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
const response = (id: string) => ({
    id: "a-" + id,
    questionId: id,
    experimentId: "e",
    userId: "u",
    textAnswer: id,
    createdAt: "now",
});
function mount(context: Partial<LearningSession> = {}) {
    const learning: LearningSession = {
        practice: false,
        submissions: [],
        operations: {},
        beforeSubmit: vi.fn(),
        rejected: vi.fn(),
        ...context,
    };
    const saved = vi.fn();
    const next = vi.fn();
    const view = renderHook(
        () =>
            useAnswerSubmission({
                questions: ["q1", "q2"].map((id) => ({
                    questionId: id,
                    isUnavailable: false,
                    question: { id, type: "TEXT", content: id, options: [] },
                })),
                answers: { q1: "one", q2: "two" },
                isCompleted: false,
                onSubmitted: saved,
                onContinue: next,
            }),
        {
            wrapper: ({ children }: { children: ReactNode }) => (
                <LearningSessionContext.Provider value={learning}>
                    {children}
                </LearningSessionContext.Provider>
            ),
        }
    );
    return { ...view, saved, next, learning };
}
beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.mocked(submitAnswer).mockReset();
});
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});
it("migrates session data and survives a closed-tab session without losing the checkpoint", () => {
    sessionStorage.setItem("key", "checkpoint");
    expect(readPersistent("key")).toBe("checkpoint");
    expect(sessionStorage.getItem("key")).toBeNull();
    sessionStorage.clear();
    expect(readPersistent("key")).toBe("checkpoint");
});
it("reports blocked storage instead of pretending to save", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("quota");
    });
    expect(() => writePersistent("key", "answer")).toThrow("quota");
});
it("persists each confirmed response before another request resolves", async () => {
    let finish!: (value: ReturnType<typeof response>) => void;
    vi.mocked(submitAnswer)
        .mockResolvedValueOnce(response("q1"))
        .mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    finish = resolve;
                })
        );
    const v = mount();
    let pending!: Promise<void>;
    act(() => {
        pending = v.result.current.submit();
    });
    await waitFor(() => expect(v.saved).toHaveBeenCalledWith([response("q1")]));
    expect(v.next).not.toHaveBeenCalled();
    await act(async () => {
        finish(response("q2"));
        await pending;
    });
    expect(v.saved).toHaveBeenCalledTimes(2);
    expect(v.next).toHaveBeenCalledOnce();
});
it("restores confirmed questions on remount and sends only the unfinished question", async () => {
    vi.mocked(submitAnswer).mockResolvedValue(response("q2"));
    const v = mount({ submissions: [response("q1")] });
    await act(() => v.result.current.submit());
    expect(submitAnswer).toHaveBeenCalledExactlyOnceWith("q2", "TEXT", "two");
});
it.each(["pending", "unknown"] as const)(
    "does not retry a persisted %s operation",
    async (state) => {
        const v = mount({
            submissions: [response("q1")],
            operations: { q2: state },
        });
        await act(() => v.result.current.submit());
        expect(submitAnswer).not.toHaveBeenCalled();
        expect(v.result.current.submissionError).toContain("尚未確認");
        expect(v.next).not.toHaveBeenCalled();
    }
);
it("never posts when the pre-request checkpoint cannot be saved", async () => {
    const v = mount({
        beforeSubmit: () => {
            throw new Error("storage blocked");
        },
    });
    await act(() => v.result.current.submit());
    expect(submitAnswer).not.toHaveBeenCalled();
    expect(v.result.current.submissionError).toContain("storage blocked");
});
it.each([400, 401, 403, 404, 422, 409, 500])(
    "classifies HTTP %i without treating duplicates as success",
    async (status) => {
        vi.mocked(submitAnswer).mockRejectedValue(
            new ApiError("rejected", status)
        );
        const v = mount();
        await act(() => v.result.current.submit());
        expect(v.learning.rejected).toHaveBeenCalledWith(
            "q1",
            [400, 401, 403, 404, 422].includes(status)
        );
        expect(v.saved).not.toHaveBeenCalled();
        expect(v.next).not.toHaveBeenCalled();
    }
);
it("practice advances without answer or grading requests", async () => {
    const v = mount({ practice: true });
    await act(() => v.result.current.submit());
    expect(submitAnswer).not.toHaveBeenCalled();
    expect(v.saved).not.toHaveBeenCalled();
    expect(v.learning.beforeSubmit).not.toHaveBeenCalled();
    expect(v.next).toHaveBeenCalledOnce();
});
it("only one tab can hold the same course lock, then a closed tab releases it", async () => {
    const held = new Set<string>();
    Object.defineProperty(navigator, "locks", {
        configurable: true,
        value: {
            request: vi.fn(
                async (
                    key: string,
                    _opts: unknown,
                    callback: (lock: unknown) => Promise<void>
                ) => {
                    if (held.has(key)) return callback(null);
                    held.add(key);
                    try {
                        await callback({ name: key });
                    } finally {
                        held.delete(key);
                    }
                }
            ),
        },
    });
    const a = renderHook(() => useLearningLock("same"), {
        wrapper: ({ children }) => <StrictMode>{children}</StrictMode>,
    });
    await waitFor(() => expect(a.result.current.acquired).toBe(true));
    const b = renderHook(() => useLearningLock("same"));
    await waitFor(() => expect(b.result.current.unavailable).toBe(true));
    expect(b.result.current.acquired).toBe(false);
    a.unmount();
    b.unmount();
    await act(async () => {});
    const c = renderHook(() => useLearningLock("same"));
    await waitFor(() => expect(c.result.current.acquired).toBe(true));
    act(() =>
        window.dispatchEvent(
            new StorageEvent("storage", {
                key: attemptSessionKey(),
                oldValue: "old",
                newValue: "logged-out",
            })
        )
    );
    expect(c.result.current.acquired).toBe(false);
});
it("reacquires its lock after a back-forward cache restoration", async () => {
    const request = vi.fn(
        async (
            _key: string,
            _opts: unknown,
            callback: (lock: unknown) => Promise<void>
        ) => callback({})
    );
    Object.defineProperty(navigator, "locks", {
        configurable: true,
        value: { request },
    });
    const v = renderHook(() => useLearningLock("resume"));
    await waitFor(() => expect(v.result.current.acquired).toBe(true));
    act(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));
    expect(v.result.current.acquired).toBe(false);
    act(() =>
        window.dispatchEvent(
            new PageTransitionEvent("pageshow", { persisted: true })
        )
    );
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(v.result.current.acquired).toBe(true);
});
