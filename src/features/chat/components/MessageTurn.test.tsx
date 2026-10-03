// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import MessageTurn from "./MessageTurn";
import type { Message } from "../types/chat";
afterEach(cleanup);
function show(message: Partial<Message>) {
    return render(
        <MessageTurn
            message={{
                id: "m",
                content: "AGGREGATE_SECRET",
                role: "assistant",
                status: "completed",
                createdAt: "now",
                ...message,
            }}
            branchState={{
                currentIndex: 1,
                total: 1,
                canGoPrev: false,
                canGoNext: false,
            }}
            actionsDisabled={false}
            isEditing={false}
            editingDraft=""
            onSwitchBranch={vi.fn()}
            onEdit={vi.fn()}
            onEditingDraftChange={vi.fn()}
            onCancelEdit={vi.fn()}
            onSubmitEdit={vi.fn()}
            onRegenerate={vi.fn()}
        />
    );
}
it("never renders internal, reasoning, tool JSON or aggregate text when structured parts exist", () => {
    show({
        characters: [{ id: "teacher", displayName: "科學老師", role: "引導" }],
        parts: [
            { id: "1", type: "text", agent: "teacher", text: "可見回答" },
            {
                id: "2",
                type: "text",
                agent: "teacher",
                text: "INTERNAL_SECRET",
                internal: true,
            },
            {
                id: "3",
                type: "reasoning",
                agent: "teacher",
                text: "REASONING_SECRET",
            },
            {
                id: "4",
                type: "tool_result",
                agent: "teacher",
                content: { private: "TOOL_SECRET" },
            },
        ],
    });
    expect(screen.getByText("科學老師")).toBeTruthy();
    expect(screen.getByText("可見回答")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/SECRET/);
});
it("renders neutral identities for unknown characters without guessing a role", () => {
    show({
        parts: [{ id: "p", type: "text", agent: "unknown", text: "回答" }],
    });
    expect(screen.getByText("學習助手")).toBeTruthy();
});
it("hides legacy thinking blocks while preserving visible answers", () => {
    show({ content: "<think>SECRET</think>可見回答" });
    expect(screen.getByText("可見回答")).toBeTruthy();
    expect(document.body.textContent).not.toContain("SECRET");
});
