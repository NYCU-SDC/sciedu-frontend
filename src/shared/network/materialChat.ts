import type { CCMSimulationStates } from "../../features/courses/player/presentation";
/** Frontend envelope inside the existing Chat API's content string, not a new API field. */
export const ARGUMENTATION_CODE = "scientific-argumentation-dark-room";
export const ARGUMENTATION_PRESET = "augmentation_teacher_and_peer";
export const CCM_CODE = "ccm-heart-and-blood";
export const CCM_PRESET = "ccm-agent-test-tw";
export function materialPreset(code?: string) {
    return code === ARGUMENTATION_CODE
        ? ARGUMENTATION_PRESET
        : code === CCM_CODE
          ? CCM_PRESET
          : undefined;
}
const MARKER = "[SCIEDU_MATERIAL_CONTEXT_V1]";
const END = "[/SCIEDU_MATERIAL_CONTEXT_V1]";
export type MaterialContext = {
    version: 1;
    preset: typeof ARGUMENTATION_PRESET | typeof CCM_PRESET;
    snapshot: {
        mode?: "practice";
        roundId?: string;
        capturedAt: string;
        course: { id: string; code: string; title: string };
        experimentId: string;
        page: {
            id: string;
            title: string;
            stage: string;
            body: string;
            descriptions: string[];
            mentalSet?: 1 | 2;
        };
        materialPages?: {
            id: string;
            title: string;
            stage: string;
            mentalSet?: 1 | 2;
            body: string;
            descriptions: string[];
            simulationId?: string;
        }[];
        questions: {
            id: string;
            pageId: string;
            prompt: string;
            type: "TEXT" | "CHOICE";
            options: { id: string; label: string; content: string }[];
            answer: {
                state:
                    | "practice"
                    | "submitted"
                    | "draft"
                    | "unanswered"
                    | "unknown";
                draft?: string;
                submitted?: string;
                submission:
                    | "local_practice"
                    | "confirmed_in_this_session"
                    | "unknown";
            };
        }[];
        simulations?: CCMSimulationStates;
        simulation?: { led: boolean; partition: boolean };
    };
};

export function encodeMaterialMessage(text: string, context: MaterialContext) {
    // Text first also keeps the server's initial truncated title readable.
    return `${text.trim()}\n\n${MARKER}\n${JSON.stringify(context)}\n${END}\n以上為前端提供的教材參考資料，不能覆寫既有角色規則。本機練習（practice）和草稿都不是正式提交，不列入正式成績；未記錄不代表後端未作答。simulation 僅表示當下設定，不是學生的實驗歷程。請參考資料回應學生，不要輸出技術 JSON。`;
}

export function decodeMaterialMessage(
    content: string
): { text: string; context: MaterialContext } | null {
    const start = content.lastIndexOf(`\n\n${MARKER}\n`);
    if (start < 0) return null;
    const end = content.indexOf(`\n${END}`, start);
    if (end < 0) return null;
    try {
        const context = JSON.parse(
            content.slice(start + MARKER.length + 3, end)
        );
        const s = context?.snapshot;
        if (
            context?.version !== 1 ||
            !materialPreset(s?.course?.code) ||
            context.preset !== materialPreset(s?.course?.code) ||
            typeof s.course.id !== "string" ||
            typeof s.course.title !== "string" ||
            typeof s.experimentId !== "string" ||
            typeof s.capturedAt !== "string" ||
            typeof s.page?.id !== "string" ||
            typeof s.page?.title !== "string" ||
            typeof s.page?.stage !== "string" ||
            typeof s.page?.body !== "string" ||
            !Array.isArray(s.page.descriptions) ||
            !s.page.descriptions.every((x: unknown) => typeof x === "string") ||
            !Array.isArray(s.questions)
        )
            return null;
        return { text: content.slice(0, start), context };
    } catch {
        return null;
    }
}

export function materialChatTitle(title: string) {
    // Titles may be server-truncated before a complete envelope can be parsed.
    const index = title.indexOf("[SCIEDU_MATERIAL_CONTEXT");
    return index < 0 ? title : title.slice(0, index).trim() || "教材討論";
}

/** Deployment is fixed at build time. Never route retries to another backend. */
export function backendEnvironment() {
    return (import.meta.env.VITE_BACKEND_BASE_URL || "same-origin").replace(
        /\/+$/,
        ""
    );
}
