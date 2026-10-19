export const SIMULATIONS = {
    "dark-room-v1": {
        src: "/simulations/dark-room/v1/index.html",
        title: "黑暗房間中的玩偶互動模擬",
    },
} as const;
export type SimulationId = keyof typeof SIMULATIONS;
export type SimulationState = { led: boolean; partition: boolean };
export const DEFAULT_SIMULATION_STATE: SimulationState = {
    led: true,
    partition: false,
};
export type PagePresentation = {
    version: 1;
    stage: "initial" | "argumentation" | "simulation" | "final";
    chatEnabled: boolean;
    preview?: boolean;
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
            !["initial", "argumentation", "simulation", "final"].includes(
                p.stage
            ) ||
            typeof p.chatEnabled !== "boolean" ||
            (p.preview !== undefined && typeof p.preview !== "boolean") ||
            (p.simulationId !== undefined &&
                !Object.hasOwn(SIMULATIONS, p.simulationId)) ||
            (p.previousAnswerPageIndex !== undefined &&
                (!Number.isInteger(p.previousAnswerPageIndex) ||
                    p.previousAnswerPageIndex < 0 ||
                    p.previousAnswerPageIndex >= pageIndex)) ||
            (p.preview && p.simulationId)
        )
            throw new Error();
        return {
            version: 1,
            stage: p.stage,
            chatEnabled: p.chatEnabled,
            preview: p.preview,
            simulationId: p.simulationId,
            previousAnswerPageIndex: p.previousAnswerPageIndex,
        };
    } catch {
        throw new Error(
            "教材頁面設定無效或 simulation 尚未支援，請聯絡管理者。"
        );
    }
}
