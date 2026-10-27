import { useEffect, useState } from "react";
import { attemptSessionKey } from "../../shared/auth/courseAttemptStorage";
/** No racy localStorage lease fallback: unavailable Web Locks leave the player read-only. */
export function useLearningLock(key: string | null) {
    const [heldKey, setHeldKey] = useState<string | null>(null);
    const [unavailable, setUnavailable] = useState(false);
    const [epoch, setEpoch] = useState(0);
    useEffect(() => {
        if (!key || !navigator.locks) return;
        let release: (() => void) | undefined;
        let cancelled = false;
        queueMicrotask(() => {
            if (cancelled) return;
            void navigator.locks
                .request(key, { ifAvailable: true }, async (lock) => {
                    if (cancelled) return;
                    if (!lock) {
                        setUnavailable(true);
                        return;
                    }
                    setHeldKey(key);
                    setUnavailable(false);
                    await new Promise<void>((resolve) => {
                        release = resolve;
                    });
                })
                .catch(() => {
                    if (!cancelled) setUnavailable(true);
                });
        });
        const unload = () => {
            cancelled = true;
            setHeldKey(null);
            release?.();
        };
        const resume = (event: PageTransitionEvent) => {
            if (event.persisted) setEpoch((n) => n + 1);
        };
        const logout = (event: StorageEvent) => {
            if (
                event.key === attemptSessionKey() &&
                event.oldValue &&
                event.newValue !== event.oldValue
            ) {
                unload();
                setUnavailable(true);
            }
        };
        window.addEventListener("pagehide", unload);
        window.addEventListener("pageshow", resume);
        window.addEventListener("storage", logout);
        return () => {
            cancelled = true;
            release?.();
            window.removeEventListener("pagehide", unload);
            window.removeEventListener("pageshow", resume);
            window.removeEventListener("storage", logout);
        };
    }, [key, epoch]);
    return {
        acquired: !key || heldKey === key,
        unavailable: unavailable || !navigator.locks,
    };
}
