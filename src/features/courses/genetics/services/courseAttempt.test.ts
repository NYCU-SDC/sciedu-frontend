// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    loadCourseAttempt,
    saveCourseAttempt,
    type CourseAttempt,
} from "./courseAttempt";

const attempt: CourseAttempt = {
    courseId: "genetics",
    courseTitle: "遺傳學",
    userEmail: "student@example.test",
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
const key = "sciedu-course-attempt:student%40example.test:genetics";
afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
});
describe("course attempt ownership", () => {
    it("restores only the signed-in student's course", () => {
        saveCourseAttempt(attempt);
        expect(loadCourseAttempt("genetics", attempt.userEmail)).toEqual(
            attempt
        );
        expect(loadCourseAttempt("genetics", "other@example.test")).toBeNull();
        expect(loadCourseAttempt("other-course", attempt.userEmail)).toBeNull();
        expect(loadCourseAttempt("genetics", "", attempt)).toBeNull();
    });
    it("validates the owner and course of navigation state", () => {
        expect(
            loadCourseAttempt("genetics", attempt.userEmail, attempt)
        ).toEqual(attempt);
        expect(
            loadCourseAttempt("genetics", "other@example.test", attempt)
        ).toBeNull();
        expect(
            loadCourseAttempt("other-course", attempt.userEmail, attempt)
        ).toBeNull();
    });
    it("keeps same-user navigation working when storage is blocked", () => {
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new DOMException("Blocked", "SecurityError");
        });
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new DOMException("Blocked", "SecurityError");
        });
        expect(() => saveCourseAttempt(attempt)).not.toThrow();
        expect(
            loadCourseAttempt("genetics", attempt.userEmail, attempt)
        ).toEqual(attempt);
        expect(loadCourseAttempt("genetics", attempt.userEmail)).toBeNull();
    });
    it("ignores legacy unscoped attempts and a mismatched stored owner", () => {
        sessionStorage.setItem(
            "sciedu-course-attempt:genetics",
            JSON.stringify(attempt)
        );
        expect(loadCourseAttempt("genetics", attempt.userEmail)).toBeNull();
        sessionStorage.setItem(
            key,
            JSON.stringify({ ...attempt, userEmail: "other@example.test" })
        );
        expect(loadCourseAttempt("genetics", attempt.userEmail)).toBeNull();
    });
    it.each([
        "not-json",
        JSON.stringify({ ...attempt, answersByPage: { 1: { q1: 123 } } }),
        JSON.stringify({ ...attempt, submissions: [{ id: "a1" }] }),
        JSON.stringify({ ...attempt, completedAt: "invalid" }),
    ])("rejects malformed data", (value) => {
        sessionStorage.setItem(key, value);
        expect(loadCourseAttempt("genetics", attempt.userEmail)).toBeNull();
    });
});
