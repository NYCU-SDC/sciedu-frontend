import { createContext, useContext } from "react";
import { DEFAULT_MODEL_ID, MODELS, type ChatModel } from "../models";

export type ModelSelectionValue = {
    /** True only when the flag opens up free switching (`"none"` mode). */
    showSelector: boolean;
    /** The models the selector offers. */
    models: ChatModel[];
    /** The user's current pick (meaningful only while `showSelector`). */
    selectedModelId: string;
    setSelectedModelId: (id: string) => void;
    /**
     * The `model` to attach to a chat request: the forced id, the user's pick,
     * or `undefined` to omit the field and let the backend use its default.
     */
    modelToSend: string | undefined;
};

/**
 * Fallback for the shared chat components (`useChat`, `Composer`) when they are
 * rendered outside a provider — e.g. the course chat, which has no model
 * selector. Behaves as the "off" mode: no selector, no `model` sent.
 */
const OFF_VALUE: ModelSelectionValue = {
    showSelector: false,
    models: MODELS,
    selectedModelId: DEFAULT_MODEL_ID,
    setSelectedModelId: () => {},
    modelToSend: undefined,
};

export const ModelSelectionContext =
    createContext<ModelSelectionValue>(OFF_VALUE);

export function useModelSelection(): ModelSelectionValue {
    return useContext(ModelSelectionContext);
}
