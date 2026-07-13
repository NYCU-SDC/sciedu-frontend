/**
 * The chat models the UI can select between. Each `id` is sent to the backend
 * as the `model` field and must match the LLM service's `ALLOWED_MODELS`
 * allowlist exactly (a mismatch is rejected with HTTP 400) — note the capital
 * `B` in `gemma-4-31B-it`.
 */
export type ChatModel = { id: string; label: string };

export const MODELS: ChatModel[] = [
    { id: "gpt-oss-120b", label: "GPT OSS 120b" },
    { id: "gemma-4-31B-it", label: "Gemma 4 31b" },
];

/** The model the selector defaults to before the user picks one. */
export const DEFAULT_MODEL_ID = "gpt-oss-120b";

/** Whether an arbitrary flag value names one of our known models. */
export function isKnownModelId(value: string | undefined): boolean {
    return MODELS.some((model) => model.id === value);
}
