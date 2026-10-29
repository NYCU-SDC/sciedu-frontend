import { backendEnvironment } from "../../shared/network/materialChat";
import { readPersistent } from "./persistentStorage";
const PREFIX = "sciedu-course-player:v1:round:";
export function practiceRoundKey(
    account: string,
    experimentId: string,
    courseId: string
) {
    return (
        PREFIX +
        JSON.stringify([backendEnvironment(), account, experimentId, courseId])
    );
}
export function currentPracticeRound(
    account: string,
    experimentId: string,
    courseId: string
) {
    return readPersistent(practiceRoundKey(account, experimentId, courseId));
}
