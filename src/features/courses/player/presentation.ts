export const SIMULATIONS = {
    "dark-room-v1": {
        src: "/simulations/dark-room/v1/index.html",
        title: "黑暗房間中的玩偶互動模擬",
    },
    "ccm-heart-v1": {
        src: "/simulations/ccm/v1/heart.html",
        title: "心臟如何推送血液",
    },
    "ccm-marrow-v1": {
        src: "/simulations/ccm/v1/marrow.html",
        title: "骨髓造血互動模擬",
    },
} as const;
export type SimulationId = keyof typeof SIMULATIONS;
export type SimulationState = { led: boolean; partition: boolean };
export const DEFAULT_SIMULATION_STATE: SimulationState = {
    led: true,
    partition: false,
};
export type CCMSimulationState = { position: number; speed: number };
export const DEFAULT_CCM_STATES = {
    "ccm-heart-v1": { position: 0, speed: 0.65 },
    "ccm-marrow-v1": { position: 0, speed: 1 },
};
export type CCMSimulationStates = Partial<
    Record<"ccm-heart-v1" | "ccm-marrow-v1", CCMSimulationState>
>;
export function validCCMState(
    id: string,
    value: unknown
): value is CCMSimulationState {
    if (!value || typeof value !== "object") return false;
    const s = value as CCMSimulationState;
    return (
        Number.isFinite(s.position) &&
        s.position >= 0 &&
        (id === "ccm-heart-v1"
            ? s.position <= 86400 && [0.5, 0.65, 0.8, 1].includes(s.speed)
            : id === "ccm-marrow-v1" &&
              Number.isInteger(s.position) &&
              s.position <= 3 &&
              [0.75, 1, 1.25].includes(s.speed))
    );
}
export function validCCMStates(value: unknown): value is CCMSimulationStates {
    return (
        !!value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.entries(value).every(([id, state]) => validCCMState(id, state))
    );
}
export const CCM_NOTICE =
    "目前教材處於測試階段，因此採用完整學習流程，所有學生皆進入 Mental Set 2。";
export type AnswerReference = {
    pageIndex: number;
    questionIndex: number;
    label: string;
};
export type PagePresentation = {
    version: 1;
    stage:
        | "initial"
        | "argumentation"
        | "simulation"
        | "final"
        | "ccm-initial"
        | "ccm-observation"
        | "ccm-discussion"
        | "ccm-final";
    chatEnabled: boolean;
    preview?: boolean;
    previewLabel?: string;
    mentalSet?: 1 | 2;
    notice?: "ccm-linear-test";
    answerReferences?: AnswerReference[];
    textChoices?: Record<string, string[]>;
    simulationId?: SimulationId;
    previousAnswerPageIndex?: number;
};

export function isSimulationState(value: unknown): value is SimulationState {
    if (!value || typeof value !== "object") return false;
    const state = value as Record<string, unknown>;
    return (
        typeof state.led === "boolean" && typeof state.partition === "boolean"
    );
}

export function parsePresentation(
    raw: string,
    pageIndex: number
): PagePresentation {
    try {
        const p = JSON.parse(raw);
        if (
            !p ||
            p.version !== 1 ||
            ![
                "initial",
                "argumentation",
                "simulation",
                "final",
                "ccm-initial",
                "ccm-observation",
                "ccm-discussion",
                "ccm-final",
            ].includes(p.stage) ||
            typeof p.chatEnabled !== "boolean" ||
            (p.preview !== undefined && typeof p.preview !== "boolean") ||
            (p.simulationId !== undefined &&
                !Object.hasOwn(SIMULATIONS, p.simulationId)) ||
            (p.previousAnswerPageIndex !== undefined &&
                (!Number.isInteger(p.previousAnswerPageIndex) ||
                    p.previousAnswerPageIndex < 0 ||
                    p.previousAnswerPageIndex >= pageIndex)) ||
            (p.previewLabel !== undefined &&
                (typeof p.previewLabel !== "string" ||
                    p.previewLabel.length > 200)) ||
            (p.mentalSet !== undefined && ![1, 2].includes(p.mentalSet)) ||
            (p.notice !== undefined && p.notice !== "ccm-linear-test") ||
            (p.answerReferences !== undefined &&
                (!Array.isArray(p.answerReferences) ||
                    p.answerReferences.length > 12 ||
                    !p.answerReferences.every(
                        (r: AnswerReference) =>
                            r &&
                            Number.isInteger(r.pageIndex) &&
                            r.pageIndex >= 0 &&
                            r.pageIndex < pageIndex &&
                            Number.isInteger(r.questionIndex) &&
                            r.questionIndex >= 0 &&
                            typeof r.label === "string" &&
                            r.label.length <= 200
                    ))) ||
            (p.textChoices !== undefined &&
                (!p.textChoices ||
                    typeof p.textChoices !== "object" ||
                    Array.isArray(p.textChoices) ||
                    !Object.entries(p.textChoices).every(
                        ([index, options]) =>
                            /^\d+$/.test(index) &&
                            Array.isArray(options) &&
                            options.length >= 2 &&
                            options.length <= 10 &&
                            new Set(options).size === options.length &&
                            options.every(
                                (x) =>
                                    typeof x === "string" &&
                                    x.length > 0 &&
                                    x.length <= 100
                            )
                    ))) ||
            (p.preview && p.simulationId)
        )
            throw new Error();
        return {
            version: 1,
            stage: p.stage,
            chatEnabled: p.chatEnabled,
            preview: p.preview,
            previewLabel: p.previewLabel,
            mentalSet: p.mentalSet,
            notice: p.notice,
            answerReferences: p.answerReferences,
            textChoices: p.textChoices,
            simulationId: p.simulationId,
            previousAnswerPageIndex: p.previousAnswerPageIndex,
        };
    } catch {
        throw new Error(
            "教材頁面設定無效或 simulation 尚未支援，請聯絡管理者。"
        );
    }
}
