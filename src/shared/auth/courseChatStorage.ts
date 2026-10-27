import {
    readPersistent,
    writePersistent,
    clearPersistent,
} from "../../features/experience/persistentStorage";
import { backendEnvironment } from "../network/materialChat";
export type CourseChatScope = {
    account: string;
    experimentId: string;
    courseId: string;
    pageId: string;
    profile?: string;
    roundId?: string;
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
            ...(scope.roundId ? ["practice", scope.roundId] : []),
            ...(scope.profile ? [scope.profile] : []),
        ])
    );
}
export function readCourseChat(scope?: CourseChatScope): string | null {
    if (!scope?.account) return null;
    try {
        const id = readPersistent(courseChatKey(scope));
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
        if (id) writePersistent(key, id);
        else {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        }
    } catch {
        throw new Error(
            "無法保存教材聊天室關聯，請確認瀏覽器儲存空間後重新載入結果。"
        );
    }
}
export function clearCourseChatStorage() {
    try {
        clearPersistent(COURSE_CHAT_PREFIX);
    } catch {
        /* No storage available. */
    }
}
