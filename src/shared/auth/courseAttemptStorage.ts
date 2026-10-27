import {
    readPersistent,
    writePersistent,
    clearPersistent,
} from "../../features/experience/persistentStorage";
import { backendEnvironment } from "../network/materialChat";
export const COURSE_ATTEMPT_PREFIX = "sciedu-course-attempt:";
export const attemptSessionKey = () =>
    "sciedu-course-attempt-session:" + backendEnvironment();
let fallbackSessionId = crypto.randomUUID();
const revokedSessions = new Set<string>();

export function getAttemptSessionId(): string {
    try {
        const stored = readPersistent(attemptSessionKey());
        if (stored && !revokedSessions.has(`${backendEnvironment()}|${stored}`))
            return `${backendEnvironment()}|${stored}`;
        writePersistent(attemptSessionKey(), fallbackSessionId);
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
        clearPersistent(COURSE_ATTEMPT_PREFIX);
        writePersistent(attemptSessionKey(), fallbackSessionId);
    } catch {
        /* In-memory session rotation still invalidates navigation state. */
    }
}
