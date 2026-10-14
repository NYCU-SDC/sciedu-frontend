export const COURSE_ATTEMPT_PREFIX = "sciedu-course-attempt:";
const SESSION_KEY = "sciedu-course-attempt-session";
let fallbackSessionId = crypto.randomUUID();
const revokedSessions = new Set<string>();

export function getAttemptSessionId(): string {
    try {
        const stored = sessionStorage.getItem(SESSION_KEY);
        if (stored && !revokedSessions.has(stored)) return stored;
        sessionStorage.setItem(SESSION_KEY, fallbackSessionId);
    } catch {
        /* Route state still works when storage is blocked. */
    }
    return fallbackSessionId;
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
        sessionStorage.setItem(SESSION_KEY, fallbackSessionId);
    } catch {
        /* In-memory session rotation still invalidates navigation state. */
    }
}
