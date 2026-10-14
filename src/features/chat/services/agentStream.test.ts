import { describe, expect, it } from "vitest";
import { initialSnapshot, parseEvent, reduceEvent } from "./agentStream";
import { mockEvents } from "./mockChat";
import type { MessagePart } from "../types/chat";
const part: MessagePart = {
    id: "p",
    type: "text",
    agent: "teacher",
    text: "final",
};
describe("agentic stream", () => {
    it("preserves ordered repeated speakers and hides internal text from the plain representation", () => {
        const state = mockEvents("m").reduce(reduceEvent, initialSnapshot());
        expect(state.phase).toBe("done");
        expect(state.characters).toHaveLength(2);
        expect(
            state.parts?.filter((p) => p.type === "text").map((p) => p.agent)
        ).toEqual(["teacher", "peer", "teacher"]);
        expect(state.content).not.toContain("MOCK_INTERNAL");
        expect(state.content).not.toContain("MOCK_TOOL");
        expect(state.activeAgents).toEqual([]);
    });
    it("uses final snapshots without duplicating deltas and supports delta-free replay", () => {
        let state = reduceEvent(initialSnapshot(), {
            type: "part_start",
            index: 0,
            part: { ...part, text: "" },
        });
        state = reduceEvent(state, {
            type: "delta",
            index: 0,
            delta: "partial",
        });
        state = reduceEvent(state, { type: "part_end", index: 0, part });
        expect(state.content).toBe("final");
        expect(
            reduceEvent(initialSnapshot(), { type: "part_end", index: 0, part })
                .content
        ).toBe("final");
    });
    it("updates interleaved indexes independently", () => {
        let state = reduceEvent(initialSnapshot(), {
            type: "part_start",
            index: 1,
            part: { ...part, id: "b", text: "B" },
        });
        state = reduceEvent(state, {
            type: "part_start",
            index: 0,
            part: { ...part, text: "A" },
        });
        state = reduceEvent(state, { type: "delta", index: 1, delta: "2" });
        expect(state.content).toBe("AB2");
    });
    it("retains partial text on errors and ignores events after terminal", () => {
        const state = reduceEvent(
            reduceEvent(initialSnapshot(), {
                type: "part_end",
                index: 0,
                part,
            }),
            { type: "error", error: "private server details", code: "x" }
        );
        expect(state.content).toBe("final");
        expect(state.error).not.toContain("private");
        expect(
            reduceEvent(state, { type: "delta", index: 0, delta: "extra" })
        ).toBe(state);
    });
    it("handles legacy events", () => {
        const state = reduceEvent(initialSnapshot(), {
            delta: "hello",
            isFinished: true,
        });
        expect(state).toMatchObject({ content: "hello", phase: "done" });
        expect(state.parts).toBeUndefined();
    });
    it("validates known frames and ignores future event types", () => {
        expect(() =>
            parseEvent({ type: "delta", index: -1, delta: "x" })
        ).toThrow();
        expect(() =>
            parseEvent({
                type: "part_start",
                index: 0,
                part: { ...part, internal: "false" },
            })
        ).toThrow();
        expect(parseEvent({ type: "future" })).toBeNull();
        expect(parseEvent({ type: "done" })).toEqual({ type: "done" });
    });
});
