// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import {
    clearCourseChatStorage,
    readCourseChat,
    saveCourseChat,
    type CourseChatScope,
} from "./courseChatStorage";
import {
    loginReturnTo,
    rememberLoginReturnTo,
    safeReturnTo,
} from "./loginReturnTo";
const scope: CourseChatScope = {
    account: "a@example.test",
    experimentId: "e",
    courseId: "c",
    pageId: "p",
};
const id = "9f7af112-b684-4a6a-ad05-d967c1278eaa";
beforeEach(() => sessionStorage.clear());
it("restores only the same account, experiment, course and stable page", () => {
    saveCourseChat(scope, id);
    expect(readCourseChat({ ...scope })).toBe(id);
    for (const field of [
        "account",
        "experimentId",
        "courseId",
        "pageId",
    ] as const)
        expect(readCourseChat({ ...scope, [field]: "other" })).toBeNull();
});
it("clears chat references on logout without deleting unrelated storage", () => {
    saveCourseChat(scope, id);
    sessionStorage.setItem("other", "keep");
    clearCourseChatStorage();
    expect(readCourseChat(scope)).toBeNull();
    expect(sessionStorage.getItem("other")).toBe("keep");
});
it("restart removes just one page reference", () => {
    saveCourseChat(scope, id);
    saveCourseChat({ ...scope, pageId: "p2" }, id);
    saveCourseChat(scope, null);
    expect(readCourseChat(scope)).toBeNull();
    expect(readCourseChat({ ...scope, pageId: "p2" })).toBe(id);
});
it("only keeps a safe local return URL", () => {
    rememberLoginReturnTo("/chat/abc?branch=1");
    expect(loginReturnTo()).toBe("/chat/abc?branch=1");
    for (const value of [
        "https://evil.test",
        "//evil.test",
        "/\\evil.test",
        "/login",
        "/chat/\n",
    ])
        expect(safeReturnTo(value)).toBe("/");
});
it("does not reuse chat IDs when the backend deployment changes", () => {
    vi.stubEnv("VITE_BACKEND_BASE_URL", "https://dev.example");
    saveCourseChat(scope, id);
    vi.stubEnv("VITE_BACKEND_BASE_URL", "https://nchc.example");
    expect(readCourseChat(scope)).toBeNull();
    vi.unstubAllEnvs();
});
it("starts CCM context chats separately from previously created default-preset chats", () => {
    saveCourseChat(scope, id);
    const ccm = { ...scope, profile: "ccm-agent-test-tw:material-context-v2" };
    expect(readCourseChat(ccm)).toBeNull();
    saveCourseChat(ccm, id);
    expect(readCourseChat(ccm)).toBe(id);
    expect(readCourseChat(scope)).toBe(id);
    clearCourseChatStorage();
    expect(readCourseChat(ccm)).toBeNull();
});
