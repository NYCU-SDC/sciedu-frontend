import { useLocation } from "react-router";
import { useState } from "react";
import { Button, Modal } from "@mantine/core";
import CoursePlayer, {
    CourseStatus,
    type CoursePlayerProps,
} from "../courses/player/CoursePlayer";
import { backendEnvironment } from "../../shared/network/materialChat";
import {
    readPersistent,
    writePersistent,
    clearPersistent,
} from "./persistentStorage";
import { useLearningLock } from "./useLearningLock";
import { COURSE_CHAT_PREFIX } from "../../shared/auth/courseChatStorage";
import { PLAYER_SESSION_PREFIX } from "../courses/player/playerSession";
import { practiceRoundKey } from "./practiceRound";
import { COURSE_ATTEMPT_PREFIX } from "../../shared/auth/courseAttemptStorage";
function roundKey(props: CoursePlayerProps) {
    return practiceRoundKey(
        props.chatScope?.account ?? "",
        props.chatScope?.experimentId ?? "",
        props.definition.id
    );
}
function ActiveRun(props: CoursePlayerProps) {
    const [initial] = useState(() => {
        try {
            if (!props.practice) return {};
            if (props.reviewMode) return { round: props.chatScope?.roundId };
            const round =
                readPersistent(roundKey(props)) ?? crypto.randomUUID();
            writePersistent(roundKey(props), round);
            return { round };
        } catch {
            return {
                error: "無法保存練習輪次，請確認瀏覽器儲存空間後重新載入。",
            };
        }
    });
    const [round, setRound] = useState(initial.round);
    const location = useLocation();
    const [confirm, setConfirm] = useState(
        Boolean(
            props.practice &&
            !props.reviewMode &&
            (location.state as { confirmRestart?: boolean } | null)
                ?.confirmRestart
        )
    );
    const [error, setError] = useState("");
    const restart = () => {
        try {
            const next = crypto.randomUUID();
            writePersistent(roundKey(props), next);
            // Remove only this browser's old round references, never remote conversations.
            for (const key of Object.keys(localStorage))
                if (
                    (key.startsWith(PLAYER_SESSION_PREFIX) ||
                        key.startsWith(COURSE_CHAT_PREFIX) ||
                        key.startsWith(COURSE_ATTEMPT_PREFIX)) &&
                    round &&
                    key.includes(round)
                )
                    clearPersistent(key);
            setRound(next);
            setConfirm(false);
            setError("");
        } catch {
            setError("無法保存新一輪練習，請確認瀏覽器儲存空間後重試。");
        }
    };
    if (initial.error) return <CourseStatus message={initial.error} isError />;
    return (
        <>
            {error && <p role="alert">{error}</p>}
            <CoursePlayer
                {...props}
                key={round ?? "standard"}
                chatScope={
                    props.chatScope
                        ? { ...props.chatScope, roundId: round }
                        : undefined
                }
                onComplete={(completion) =>
                    props.onComplete?.({
                        ...completion,
                        ...(props.practice
                            ? { practice: true, roundId: round }
                            : {}),
                    })
                }
                onRestart={
                    props.practice && !props.reviewMode
                        ? () => setConfirm(true)
                        : undefined
                }
            />
            {confirm && (
                <Modal
                    opened={confirm}
                    onClose={() => setConfirm(false)}
                    title="重新練習？"
                    centered
                >
                    <p>
                        這會重置目前答案、模擬與進度，並開始全新的 AI
                        對話。後端舊對話會保留。
                    </p>
                    <Button variant="default" onClick={() => setConfirm(false)}>
                        取消
                    </Button>{" "}
                    <Button onClick={restart}>開始新一輪</Button>
                </Modal>
            )}
        </>
    );
}
export default function CourseRun(props: CoursePlayerProps) {
    const key = JSON.stringify([
        "sciedu-learning-lock",
        backendEnvironment(),
        props.chatScope?.account,
        props.chatScope?.experimentId,
        props.definition.id,
    ]);
    const lock = useLearningLock(key);
    if (!lock.acquired)
        return (
            <main style={{ padding: 32 }}>
                <CourseStatus
                    message={
                        lock.unavailable
                            ? "此教材已在其他分頁操作中，或瀏覽器不支援安全鎖定。請切回原分頁，或關閉原分頁後重新載入。"
                            : "正在確認學習進度…"
                    }
                />
                <button onClick={() => location.reload()}>重新載入</button>
            </main>
        );
    return <ActiveRun {...props} />;
}
