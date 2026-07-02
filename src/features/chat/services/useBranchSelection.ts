import { useCallback, useMemo, useState } from "react";
import type {
    BranchDirection,
    Message,
    MessageBranchState,
} from "../types/chat";
import {
    buildVisibleMessages,
    getBranchState as getBranchStatePure,
    toBranchKey,
} from "./branching";

/**
 * The only genuine client UI state in the history concern: which child branch
 * is selected at each parent. Branch resolution itself is pure (see
 * `branching.ts`); this hook just holds the selection and exposes navigation.
 */
export function useBranchSelection(messages: Message[]) {
    const [selection, setSelection] = useState<Record<string, string>>({});

    const visible = useMemo(
        () => buildVisibleMessages(messages, selection),
        [messages, selection]
    );

    const switchBranch = useCallback(
        (messageId: string, direction: BranchDirection) => {
            const target = messages.find((m) => m.id === messageId);
            if (!target) return;

            const siblings = messages.filter(
                (m) =>
                    m.role === target.role &&
                    m.previousID === target.previousID
            );
            if (siblings.length <= 1) return;

            const currentIndex = siblings.findIndex((m) => m.id === messageId);
            if (currentIndex < 0) return;

            const nextIndex =
                direction === "prev" ? currentIndex - 1 : currentIndex + 1;
            const nextMessage = siblings[nextIndex];
            if (!nextMessage) return;

            setSelection((prev) => ({
                ...prev,
                [toBranchKey(target.previousID)]: nextMessage.id,
            }));
        },
        [messages]
    );

    const getBranchState = useCallback(
        (messageId: string): MessageBranchState =>
            getBranchStatePure(messages, messageId),
        [messages]
    );

    /** Pin a parent's selection to a specific child (e.g. a just-sent branch). */
    const selectBranch = useCallback((parentID: string | undefined, childID: string) => {
        setSelection((prev) => ({ ...prev, [toBranchKey(parentID)]: childID }));
    }, []);

    return { visible, switchBranch, getBranchState, selectBranch };
}
