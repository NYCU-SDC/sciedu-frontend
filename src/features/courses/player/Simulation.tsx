import { useEffect, useRef, useState } from "react";
import {
    DEFAULT_SIMULATION_STATE,
    SIMULATIONS,
    isSimulationState,
    type SimulationId,
    type SimulationState,
} from "./presentation";
import styles from "./Simulation.module.css";

const CHANNEL = "sciedu-dark-room-v1";
export default function Simulation({
    id,
    state = DEFAULT_SIMULATION_STATE,
    onChange,
}: {
    id: SimulationId;
    state?: SimulationState;
    onChange?: (state: SimulationState) => void;
}) {
    const [attempt, setAttempt] = useState(0);
    const [status, setStatus] = useState<"loading" | "ready" | "error">(
        "loading"
    );
    const [expanded, setExpanded] = useState(false);
    const iframe = useRef<HTMLIFrameElement>(null);
    const latest = useRef({ state, onChange });
    useEffect(() => {
        latest.current = { state, onChange };
    }, [state, onChange]);
    useEffect(() => {
        const timeout = window.setTimeout(() => setStatus("error"), 15000);
        const receive = (event: MessageEvent) => {
            // sandbox has an opaque (null) origin; identity is the exact iframe window.
            if (
                event.source !== iframe.current?.contentWindow ||
                event.data?.channel !== CHANNEL
            )
                return;
            if (event.data.type === "ready") {
                window.clearTimeout(timeout);
                setStatus("ready");
                iframe.current?.contentWindow?.postMessage(
                    {
                        channel: CHANNEL,
                        type: "set",
                        state: latest.current.state,
                    },
                    "*"
                );
            } else if (
                event.data.type === "state" &&
                isSimulationState(event.data.state)
            ) {
                const { led, partition } = event.data.state;
                latest.current.onChange?.({ led, partition });
            } else if (event.data.type === "error") {
                window.clearTimeout(timeout);
                setStatus("error");
            }
        };
        window.addEventListener("message", receive);
        return () => {
            window.clearTimeout(timeout);
            window.removeEventListener("message", receive);
        };
    }, [attempt]);
    useEffect(() => {
        if (!expanded) return;
        const escape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setExpanded(false);
        };
        window.addEventListener("keydown", escape);
        return () => window.removeEventListener("keydown", escape);
    }, [expanded]);
    const config = SIMULATIONS[id];
    return (
        <section
            className={`${styles.panel} ${expanded ? styles.expanded : ""}`}
            aria-label={config.title}
        >
            <div className={styles.toolbar}>
                <strong>互動模擬</strong>
                <button
                    type="button"
                    disabled={status !== "ready"}
                    onClick={() =>
                        iframe.current?.contentWindow?.postMessage(
                            {
                                channel: CHANNEL,
                                type: "set",
                                state: DEFAULT_SIMULATION_STATE,
                            },
                            "*"
                        )
                    }
                >
                    重設 LED／隔板
                </button>
                <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setExpanded(!expanded)}
                >
                    {expanded ? "縮回教材" : "放大模擬"}
                </button>
            </div>
            {status === "loading" && <p role="status">模擬載入中…</p>}
            {status === "error" && (
                <div role="alert">
                    模擬無法載入。請確認網路及瀏覽器的 WebGL／硬體加速設定。
                    <button
                        type="button"
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
                ref={iframe}
                src={config.src}
                title={config.title}
                sandbox="allow-scripts"
                onLoad={() =>
                    iframe.current?.contentWindow?.postMessage(
                        { channel: CHANNEL, type: "hello" },
                        "*"
                    )
                }
            />
        </section>
    );
}
