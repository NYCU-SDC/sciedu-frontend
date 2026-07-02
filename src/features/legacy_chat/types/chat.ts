/**
 * Re-export shim so the relocated legacy files keep resolving `../types/chat`
 * without edits, while the domain types stay single-sourced in the active chat
 * feature. Legacy code is frozen — do not add new types here.
 */
export type {
    Message,
    MessageRole,
    MessageStatus,
} from "../../chat/types/chat";
