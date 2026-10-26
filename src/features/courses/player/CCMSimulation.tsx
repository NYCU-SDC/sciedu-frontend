import { useEffect, useRef, useState } from "react";
import {
    SIMULATIONS,
    validCCMState,
    type CCMSimulationState,
} from "./presentation";
import ExpandButton from "../genetics/components/ExpandButton";
import styles from "./Simulation.module.css";

export default function CCMSimulation({
    id,
    state,
    onChange,
    embedded = false,
}: {
    id: "ccm-heart-v1" | "ccm-marrow-v1";
    embedded?: boolean;
    state?: CCMSimulationState;
    onChange?: (state: CCMSimulationState) => void;
}) {
    const frame = useRef<HTMLIFrameElement>(null);
    const latest = useRef({ state, onChange });
    const [attempt, setAttempt] = useState(0);
    const [status, setStatus] = useState("loading");
    const [expanded, setExpanded] = useState(false);
    const channel = `sciedu-${id}`;
    useEffect(() => {
        latest.current = { state, onChange };
    }, [state, onChange]);
    useEffect(() => {
        const timer = window.setTimeout(() => setStatus("error"), 15000);
        const receive = (event: MessageEvent) => {
            if (
                event.source !== frame.current?.contentWindow ||
                event.data?.channel !== channel
            )
                return;
            if (event.data.type === "ready") {
                clearTimeout(timer);
                setStatus("ready");
                frame.current?.contentWindow?.postMessage(
                    { channel, type: "restore", state: latest.current.state },
                    "*"
                );
            } else if (
                event.data.type === "state" &&
                validCCMState(id, event.data.state)
            ) {
                const { position, speed } = event.data.state;
                latest.current.onChange?.({ position, speed });
            } else if (event.data.type === "error") {
                clearTimeout(timer);
                setStatus("error");
            }
        };
        window.addEventListener("message", receive);
        return () => {
            clearTimeout(timer);
            window.removeEventListener("message", receive);
        };
    }, [attempt, channel, id]);
    useEffect(() => {
        if (!expanded) return;
        const escape = (e: KeyboardEvent) => {
            if (e.key === "Escape") setExpanded(false);
        };
        window.addEventListener("keydown", escape);
        return () => window.removeEventListener("keydown", escape);
    }, [expanded]);
    return (
        <section
            className={`${styles.panel} ${embedded && !expanded ? styles.embedded : ""} ${expanded ? styles.expanded : ""}`}
            aria-label={SIMULATIONS[id].title}
        >
            <div className={styles.toolbar}>
                <strong>{SIMULATIONS[id].title}</strong>
                <button
                    type="button"
                    disabled={status !== "ready"}
                    onClick={() =>
                        frame.current?.contentWindow?.postMessage(
                            { channel, type: "reset" },
                            "*"
                        )
                    }
                >
                    重設模擬
                </button>
                <ExpandButton
                    className={styles.expandButton}
                    label={expanded ? "縮回教材" : "放大模擬"}
                    expanded={expanded}
                    onClick={() => setExpanded(!expanded)}
                />
            </div>
            {status === "loading" && <p role="status">模擬載入中…</p>}
            {status === "error" && (
                <div role="alert">
                    影片或模擬圖片無法載入，請確認網路或瀏覽器媒體支援。
                    <button
                        onClick={() => {
                            setStatus("loading");
                            setAttempt(attempt + 1);
                        }}
                    >
                        重新載入模擬
                    </button>
                </div>
            )}
            <iframe
                key={attempt}
                ref={frame}
                src={SIMULATIONS[id].src}
                title={SIMULATIONS[id].title}
                sandbox="allow-scripts"
                onLoad={() =>
                    frame.current?.contentWindow?.postMessage(
                        { channel, type: "hello" },
                        "*"
                    )
                }
            />
        </section>
    );
}
