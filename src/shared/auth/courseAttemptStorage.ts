import { backendEnvironment } from "../network/materialChat";
export const COURSE_ATTEMPT_PREFIX = "sciedu-course-attempt:";
const sessionKey = () =>
    "sciedu-course-attempt-session:" + backendEnvironment();
let fallbackSessionId = crypto.randomUUID();
const revokedSessions = new Set<string>();

export function getAttemptSessionId(): string {
    try {
        const stored = sessionStorage.getItem(sessionKey());
        if (stored && !revokedSessions.has(`${backendEnvironment()}|${stored}`))
            return `${backendEnvironment()}|${stored}`;
        sessionStorage.setItem(sessionKey(), fallbackSessionId);
    } catch {
        /* Route state still works when storage is blocked. */
    }
    return `${backendEnvironment()}|${fallbackSessionId}`;
}

/** Remove only course attempt data; invalidate old history state as well. */
export function clearCourseAttemptStorage() {
    revokedSessions.add(getAttemptSessionId());
    fallbackSessionId = crypto.randomUUID();
    try {
        const keys = Array.from({ length: sessionStorage.length }, (_, i) =>
            sessionStorage.key(i)
        );
        for (const key of keys)
            if (key?.startsWith(COURSE_ATTEMPT_PREFIX))
                sessionStorage.removeItem(key);
        sessionStorage.setItem(sessionKey(), fallbackSessionId);
    } catch {
        /* In-memory session rotation still invalidates navigation state. */
    }
}
