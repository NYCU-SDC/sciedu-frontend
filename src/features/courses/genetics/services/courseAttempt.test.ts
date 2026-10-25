import { backendEnvironment } from "../../../../shared/network/materialChat";
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    clearCourseAttemptStorage,
    getAttemptSessionId,
} from "../../../../shared/auth/courseAttemptStorage";
import {
    loadCourseAttempt,
    saveCourseAttempt,
    type CourseAttempt,
} from "./courseAttempt";
let attempt: CourseAttempt;
const key = `sciedu-course-attempt:${encodeURIComponent(backendEnvironment())}:student%40example.test:e1:genetics`;
beforeEach(() => {
    clearCourseAttemptStorage();
    attempt = {
        courseId: "genetics",
        courseTitle: "遺傳學",
        userEmail: "student@example.test",
        experimentId: "e1",
        sessionId: getAttemptSessionId(),
        startedAt: "2026-09-23T00:00:00Z",
        completedAt: "2026-09-23T00:10:00Z",
        answersByPage: { 1: { q1: "private answer" } },
        submissions: [
            {
                id: "a1",
                questionId: "q1",
                experimentId: "e1",
                userId: "u1",
                textAnswer: "private answer",
                createdAt: "2026-09-23T00:09:00Z",
            },
        ],
    };
});
afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
});
const load = (
    email = attempt.userEmail,
    experimentId = "e1",
    candidate?: unknown
) => loadCourseAttempt("genetics", email, experimentId, candidate);
describe("attempt ownership and logout", () => {
    it("isolates accounts, experiments, and courses", () => {
        saveCourseAttempt(attempt);
        expect(load()).toEqual(attempt);
        expect(load("other@example.test")).toBeNull();
        expect(load(attempt.userEmail, "e2")).toBeNull();
        expect(
            loadCourseAttempt("other-course", attempt.userEmail, "e1")
        ).toBeNull();
        expect(load("")).toBeNull();
    });
    it("validates the owner and experiment of route state and nested submissions", () => {
        expect(load(attempt.userEmail, "e1", attempt)).toEqual(attempt);
        expect(load("other@example.test", "e1", attempt)).toBeNull();
        expect(load(attempt.userEmail, "e2", attempt)).toBeNull();
        expect(
            load(attempt.userEmail, "e1", {
                ...attempt,
                submissions: [
                    { ...attempt.submissions[0], experimentId: "e2" },
                ],
            })
        ).toBeNull();
    });
    it("clears attempts and invalidates history state after logout, even for the same account", () => {
        saveCourseAttempt(attempt);
        sessionStorage.setItem("unrelated", "keep");
        sessionStorage.setItem("sciedu-course-attempt:legacy", "private");
        clearCourseAttemptStorage();
        expect(sessionStorage.getItem(key)).toBeNull();
        expect(
            sessionStorage.getItem("sciedu-course-attempt:legacy")
        ).toBeNull();
        expect(sessionStorage.getItem("unrelated")).toBe("keep");
        expect(load()).toBeNull();
        expect(load(attempt.userEmail, "e1", attempt)).toBeNull();
    });
    it("keeps route state usable with blocked storage, but revokes it on logout", () => {
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new DOMException("Blocked");
        });
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new DOMException("Blocked");
        });
        attempt.sessionId = getAttemptSessionId();
        expect(() => saveCourseAttempt(attempt)).not.toThrow();
        expect(load(attempt.userEmail, "e1", attempt)).toEqual(attempt);
        clearCourseAttemptStorage();
        expect(load(attempt.userEmail, "e1", attempt)).toBeNull();
    });
    it.each(["json", "answers", "submission", "date"])(
        "rejects malformed %s",
        (kind) => {
            const value =
                kind === "json"
                    ? "not-json"
                    : JSON.stringify({
                          ...attempt,
                          ...(kind === "answers"
                              ? { answersByPage: { 1: { q1: 123 } } }
                              : kind === "submission"
                                ? { submissions: [{ id: "a1" }] }
                                : { completedAt: "invalid" }),
                      });
            sessionStorage.setItem(key, value);
            expect(load()).toBeNull();
        }
    );
    it("does not load old user-only storage", () => {
        sessionStorage.setItem(
            "sciedu-course-attempt:student%40example.test:genetics",
            JSON.stringify(attempt)
        );
        expect(load()).toBeNull();
    });
});

it("does not restore attempts or navigation state from a different backend", () => {
    vi.stubEnv("VITE_BACKEND_BASE_URL", "https://dev.example");
    attempt.sessionId = getAttemptSessionId();
    saveCourseAttempt(attempt);
    vi.stubEnv("VITE_BACKEND_BASE_URL", "https://nchc.example");
    expect(load(attempt.userEmail, "e1", attempt)).toBeNull();
    vi.stubEnv("VITE_BACKEND_BASE_URL", "https://dev.example");
    expect(load()).toEqual(attempt);
    vi.unstubAllEnvs();
});
