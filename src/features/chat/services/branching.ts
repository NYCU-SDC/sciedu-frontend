import type { Message, MessageBranchState } from "../types/chat";

/**
 * Pure branch-resolution logic for the conversation tree.
 *
 * Messages form a tree via `previousID`: a parent can have multiple children
 * (siblings) when the user regenerates or edits a prompt. These helpers turn
 * that tree + a per-parent selection into the single visible message list, with
 * no React involved — trivially testable.
 */

export const ROOT_BRANCH_KEY = "__root__";

/** Maps a message's `previousID` to the key used in the children map. */
export function toBranchKey(previousID?: string): string {
    return previousID ?? ROOT_BRANCH_KEY;
}

/** Groups every message by its parent key (root for top-level messages). */
export function buildChildrenMap(messages: Message[]): Map<string, Message[]> {
    const map = new Map<string, Message[]>();

    for (const message of messages) {
        const key = toBranchKey(message.previousID);
        const siblings = map.get(key);

        if (siblings) {
            siblings.push(message);
        } else {
            map.set(key, [message]);
        }
    }

    return map;
}

/**
 * Walks the tree from the root, following the selected child at each parent
 * (defaulting to the most recent sibling), to produce the visible branch.
 */
export function buildVisibleMessages(
    messages: Message[],
    branchSelectionByParent: Record<string, string>
): Message[] {
    const childrenMap = buildChildrenMap(messages);
    const visible: Message[] = [];
    let currentKey = ROOT_BRANCH_KEY;

    while (true) {
        const children = childrenMap.get(currentKey);
        if (!children || children.length === 0) break;

        const selectedID = branchSelectionByParent[currentKey];
        const selectedMessage =
            children.find((message) => message.id === selectedID) ??
            children[children.length - 1];

        visible.push(selectedMessage);
        currentKey = selectedMessage.id;
    }

    return visible;
}

/**
 * Position of a user message among its sibling branches (those sharing the same
 * `previousID`). Used to render the "‹ 2/3 ›" branch switcher.
 */
export function getBranchState(
    messages: Message[],
    messageId: string
): MessageBranchState {
    const target = messages.find((message) => message.id === messageId);
    if (!target || target.role !== "user") {
        return {
            currentIndex: 1,
            total: 1,
            canGoPrev: false,
            canGoNext: false,
        };
    }

    const siblings = messages.filter(
        (message) =>
            message.role === "user" &&
            message.previousID === target.previousID
    );

    const currentIndex = siblings.findIndex(
        (message) => message.id === messageId
    );
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;

    return {
        currentIndex: safeIndex + 1,
        total: siblings.length || 1,
        canGoPrev: safeIndex > 0,
        canGoNext: safeIndex < siblings.length - 1,
    };
}
