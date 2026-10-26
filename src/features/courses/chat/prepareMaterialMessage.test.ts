import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { api } from "../../../shared/utils/api";
import { prepareMaterialMessage } from "./prepareMaterialMessage";
import {
    ARGUMENTATION_CODE,
    ARGUMENTATION_PRESET,
    decodeMaterialMessage,
    encodeMaterialMessage,
    materialChatTitle,
} from "../../../shared/network/materialChat";
import type {
    SubmittedAnswerResponse,
    CourseDefinition,
    CoursePageRequest,
} from "../genetics/types/types";
vi.mock("../../../shared/utils/api", () => ({ api: vi.fn() }));
const page: CoursePageRequest = {
    pageId: "p",
    pageIndex: 0,
    secondaryTitle: "Simulation",
    activeNavbarTitles: [0],
    contextTextIds: ["hidden"],
    request: {
        type: "material",
        presentation: {
            version: 1,
            stage: "simulation",
            chatEnabled: true,
            simulationId: "dark-room-v1",
        },
        content: { descriptionId: "body", imageIds: [] },
        questionSections: [{ titleId: "label", questionId: "q" }],
    },
};
const definition: CourseDefinition = {
    id: "course",
    code: ARGUMENTATION_CODE,
    title: "科學論證",
    pages: [page],
    navigation: { variant: "stepper", mainTitle: "test" },
};
function input() {
    return {
        definition,
        page,
        scope: {
            account: "student",
            experimentId: "exp",
            courseId: "course",
            pageId: "p",
        },
        answersByPage: {} as Record<number, Record<string, string>>,
        submissions: [] as SubmittedAnswerResponse[],
        simulation: { led: true, partition: false },
    };
}
beforeEach(() => {
    vi.mocked(api).mockReset();
    vi.mocked(api).mockImplementation(
        async (path) =>
            (path.includes("/questions/")
                ? {
                      id: "q",
                      type: "TEXT",
                      content: "why?",
                      options: [],
                      correctAnswer: "DO NOT SEND",
                      isCorrect: true,
                  }
                : {
                      content: path.endsWith("hidden")
                          ? "hidden description"
                          : "body",
                  }) as never
    );
});
afterEach(() => vi.restoreAllMocks());
it("captures only allowed content, explicit preset, draft and current simulation", async () => {
    const data = input();
    data.answersByPage = { 0: { q: "draft", foreign: "OTHER STUDENT" } };
    const wire = await prepareMaterialMessage("help", data);
    const decoded = decodeMaterialMessage(wire)!;
    expect(decoded.text).toBe("help");
    expect(decoded.context.preset).toBe(ARGUMENTATION_PRESET);
    expect(decoded.context.snapshot.page.descriptions).toEqual([
        "hidden description",
    ]);
    expect(decoded.context.snapshot.questions[0].answer).toEqual({
        state: "draft",
        draft: "draft",
        submission: "unknown",
    });
    expect(decoded.context.snapshot.simulation).toEqual({
        led: true,
        partition: false,
    });
    expect(wire).not.toContain("DO NOT SEND");
    expect(wire).not.toContain("OTHER STUDENT");
    expect(wire).not.toContain("student");
    expect(encodeMaterialMessage("edited", decoded.context)).toContain(
        '"draft":"draft"'
    );
    expect(
        decodeMaterialMessage(encodeMaterialMessage("edited", decoded.context))
            ?.text
    ).toBe("edited");
});
it("does not claim missing local answers were never submitted", async () => {
    const data = input();
    expect(
        decodeMaterialMessage(await prepareMaterialMessage("help", data))
            ?.context.snapshot.questions[0].answer
    ).toEqual({ state: "unknown", submission: "unknown" });
    data.answersByPage = { 0: { q: "" } };
    expect(
        decodeMaterialMessage(await prepareMaterialMessage("help", data))
            ?.context.snapshot.questions[0].answer
    ).toEqual({ state: "unanswered", draft: "", submission: "unknown" });
});
it("keeps confirmed answer separate from newer draft and rejects another experiment's submission", async () => {
    const data = input();
    data.answersByPage = { 0: { q: "new draft" } };
    data.submissions = [
        {
            id: "a",
            questionId: "q",
            experimentId: "exp",
            userId: "u",
            createdAt: "now",
            textAnswer: "submitted",
        },
    ];
    let answer = decodeMaterialMessage(
        await prepareMaterialMessage("help", data)
    )!.context.snapshot.questions[0].answer;
    expect(answer).toEqual({
        state: "submitted",
        draft: "new draft",
        submitted: "submitted",
        submission: "confirmed_in_this_session",
    });
    data.submissions[0].experimentId = "other";
    answer = decodeMaterialMessage(await prepareMaterialMessage("help", data))!
        .context.snapshot.questions[0].answer;
    expect(answer.state).toBe("draft");
    expect(answer.submitted).toBeUndefined();
});
it("freezes the clicked state while content requests are pending; later send gets new state", async () => {
    const data = input();
    data.answersByPage = { 0: { q: "before" } };
    const pending = prepareMaterialMessage("help", data);
    data.answersByPage[0].q = "after";
    data.simulation.led = false;
    const first = decodeMaterialMessage(await pending)!.context.snapshot;
    expect(first.questions[0].answer.draft).toBe("before");
    expect(first.simulation?.led).toBe(true);
    const next = decodeMaterialMessage(
        await prepareMaterialMessage("next", data)
    )!.context.snapshot;
    expect(next.questions[0].answer.draft).toBe("after");
    expect(next.simulation?.led).toBe(false);
});
it("fails closed for missing content, metadata, scope or excessive context", async () => {
    vi.mocked(api).mockRejectedValueOnce(Error("403"));
    await expect(prepareMaterialMessage("help", input())).rejects.toThrow(
        "403"
    );
    const noMetadata = input();
    noMetadata.page = { ...page, contextTextIds: [] };
    await expect(prepareMaterialMessage("help", noMetadata)).rejects.toThrow(
        "缺少圖說"
    );
    const mismatch = input();
    mismatch.scope.courseId = "other";
    await expect(prepareMaterialMessage("help", mismatch)).rejects.toThrow(
        "登入身分"
    );
    await expect(
        prepareMaterialMessage("x".repeat(65000), input())
    ).rejects.toThrow("過長");
});
it("does not opt ordinary courses into the new context or preset", async () => {
    const data = input();
    data.definition = { ...definition, code: "legacy" };
    expect(await prepareMaterialMessage("hello", data)).toBe("hello");
    expect(api).not.toHaveBeenCalled();
    expect(decodeMaterialMessage("plain text")).toBeNull();
    expect(
        decodeMaterialMessage(
            "hello\n\n[SCIEDU_MATERIAL_CONTEXT_V1]\nnot json\n[/SCIEDU_MATERIAL_CONTEXT_V1]"
        )
    ).toBeNull();
    expect(materialChatTitle("help\n\n[SCIEDU_MATERIAL_CONTEXT_V1]\n{")).toBe(
        "help"
    );
});
