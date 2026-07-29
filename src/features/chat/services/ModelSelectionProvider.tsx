import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useFeatureFlagVariantKey } from "@posthog/react";
import { DEFAULT_MODEL_ID, MODELS, isKnownModelId } from "../models";
import {
    ModelSelectionContext,
    type ModelSelectionValue,
} from "./ModelSelectionContext";

const FLAG_KEY = "force-model-selection";
const STORAGE_KEY = "sciedu.selectedModel";

function readStoredModel(): string {
    if (typeof window === "undefined") return DEFAULT_MODEL_ID;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored && isKnownModelId(stored) ? stored : DEFAULT_MODEL_ID;
}

/**
 * Resolves the `force-model-selection` PostHog flag into one of three modes and
 * exposes the selection to the chat send path (`useChat` / `startChat`) and the
 * `ModelSelector` UI:
 *   - flag is a known model id → forced: no selector, always send that id.
 *   - flag is `"none"`         → selectable: show the selector, persist the pick.
 *   - anything else/undefined  → off: no selector, omit `model` (backend default).
 */
export function ModelSelectionProvider({ children }: { children: ReactNode }) {
    const flag = useFeatureFlagVariantKey(FLAG_KEY);
    const forcedModelId =
        typeof flag === "string" && isKnownModelId(flag) ? flag : undefined;
    const showSelector = flag === "none";

    const [selectedModelId, setSelectedModelIdState] =
        useState<string>(readStoredModel);

    const setSelectedModelId = useCallback((id: string) => {
        setSelectedModelIdState(id);
        if (typeof window !== "undefined") {
            window.localStorage.setItem(STORAGE_KEY, id);
        }
    }, []);

    const value = useMemo<ModelSelectionValue>(() => {
        const modelToSend = forcedModelId
            ? forcedModelId
            : showSelector
              ? selectedModelId
              : undefined;
        return {
            showSelector,
            models: MODELS,
            selectedModelId,
            setSelectedModelId,
            modelToSend,
        };
    }, [forcedModelId, showSelector, selectedModelId, setSelectedModelId]);

    return (
        <ModelSelectionContext.Provider value={value}>
            {children}
        </ModelSelectionContext.Provider>
    );
}
