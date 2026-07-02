import { useContext } from "react";
import { ChatAreaContext } from "./ChatArea.context";

export function useChatAreaContext() {
    const context = useContext(ChatAreaContext);

    if (!context) {
        throw new Error(
            "ChatArea components must be used inside ChatArea.Root."
        );
    }

    return context;
}
