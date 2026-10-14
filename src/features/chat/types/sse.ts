import type { Character, MessagePart, MessageStatus } from "./chat";
export type StreamEvent =
    | { type: "cast"; characters: Character[] }
    | {
          type: "agent_start";
          agent: string;
          parent?: string;
          summonedBy?: string;
      }
    | { type: "part_start" | "part_end"; index: number; part: MessagePart }
    | { type: "delta"; index: number; delta: string }
    | { type: "agent_end"; agent: string }
    | { type: "done"; finishReason?: string; status?: MessageStatus }
    | { type: "error"; error: string; code: string };
export interface StreamDelta {
    delta: string;
    isFinished: boolean;
}
export type ChatEvent = StreamEvent | StreamDelta;
