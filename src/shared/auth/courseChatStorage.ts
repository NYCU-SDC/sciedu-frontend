import { backendEnvironment } from "../network/materialChat";
export type CourseChatScope = {
    account: string;
    experimentId: string;
    courseId: string;
    pageId: string;
    profile?: string;
};
export const COURSE_CHAT_PREFIX = "sciedu-course-chat:v1:";
export function courseChatKey(scope: CourseChatScope) {
    return (
        COURSE_CHAT_PREFIX +
        JSON.stringify([
            backendEnvironment(),
            scope.account,
            scope.experimentId,
            scope.courseId,
            scope.pageId,
            ...(scope.profile ? [scope.profile] : []),
        ])
    );
}
export function readCourseChat(scope?: CourseChatScope): string | null {
    if (!scope?.account) return null;
    try {
        const id = sessionStorage.getItem(courseChatKey(scope));
        return id &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                id
            )
            ? id
            : null;
    } catch {
        return null;
    }
}
export function saveCourseChat(
    scope: CourseChatScope | undefined,
    id: string | null
) {
    if (!scope?.account) return;
    try {
        const key = courseChatKey(scope);
        if (id) sessionStorage.setItem(key, id);
        else sessionStorage.removeItem(key);
    } catch {
        /* Memory-only chat remains usable. */
    }
}
export function clearCourseChatStorage() {
    try {
        for (const key of Object.keys(sessionStorage))
            if (key.startsWith(COURSE_CHAT_PREFIX))
                sessionStorage.removeItem(key);
    } catch {
        /* No storage available. */
    }
}
