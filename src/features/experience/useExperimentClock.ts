import { useEffect, useState } from "react";
import type { Experiment } from "../admin/types";
export function useExperimentClock(
    experiments: Pick<Experiment, "scheduledStartAt" | "scheduledEndAt">[] = []
) {
    const [now, setNow] = useState(Date.now);
    const boundaries = experiments
        .flatMap((e) => [
            Date.parse(e.scheduledStartAt),
            Date.parse(e.scheduledEndAt),
        ])
        .filter((n) => n > now);
    const next = Math.min(...boundaries, now + 60000);
    useEffect(() => {
        const update = () => setNow(Date.now());
        const timer = window.setTimeout(update, Math.max(1, next - Date.now()));
        window.addEventListener("focus", update);
        document.addEventListener("visibilitychange", update);
        return () => {
            clearTimeout(timer);
            window.removeEventListener("focus", update);
            document.removeEventListener("visibilitychange", update);
        };
    }, [next]);
    return now;
}
