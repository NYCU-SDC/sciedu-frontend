import { api } from "../utils/api";
export type CourseContext = {
    experimentId: string;
    courseId: string;
    pageId: string;
};
export type ChatConfiguration = {
    preset: string;
    workflow: "general" | "argumentation-v1";
    locked: boolean;
};
export type TeachingState = {
    stage: "claim" | "warrant" | "backing" | "rebuttal";
    phase: "awaiting_answer" | "choice" | "discussion" | "completed";
};
export type LearningAction =
    | "start"
    | "message"
    | "discuss"
    | "continue"
    | "finish_discussion";
export type DraftAnswer = { questionId: string; value: string };
export type LearningInput = {
    requestId: string;
    action: LearningAction;
    draftAnswers: DraftAnswer[];
    simulationState?: { led: boolean; partition: boolean };
    sourceMessageId?: string;
};
export type LearningMetadata = {
    action: LearningAction;
    preset: string;
    context: Record<string, unknown>;
    beforeState?: TeachingState;
    teachingState?: TeachingState;
};
export function learnerChatConfiguration(scope: CourseContext) {
    return api<{ configuration: ChatConfiguration | null }>(
        `/api/course-chat/configuration?${new URLSearchParams(scope)}`
    );
}
export function availableChatPresets() {
    return api<{ name: string; description: string }[]>("/api/chat/presets");
}
export function courseChatConfiguration(
    experimentId: string,
    courseId: string
) {
    return api<{ configuration: ChatConfiguration | null }>(
        `/api/experiments/${experimentId}/courses/${courseId}/chat-configuration`
    );
}
export function saveCourseChatConfiguration(
    experimentId: string,
    courseId: string,
    configuration: Pick<ChatConfiguration, "preset" | "workflow">
) {
    return api<ChatConfiguration>(
        `/api/experiments/${experimentId}/courses/${courseId}/chat-configuration`,
        { method: "PUT", body: JSON.stringify(configuration) }
    );
}
export function replayLearningInput(message: {
    id: string;
    learning?: LearningMetadata;
}): LearningInput | undefined {
    return message.learning
        ? {
              requestId: crypto.randomUUID(),
              action: message.learning.action,
              draftAnswers: [],
              sourceMessageId: message.id,
          }
        : undefined;
}
