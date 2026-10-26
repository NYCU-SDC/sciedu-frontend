import { api } from "../../../shared/utils/api";
import {
    CCM_CODE,
    materialPreset,
    encodeMaterialMessage,
    type MaterialContext,
} from "../../../shared/network/materialChat";
import type { CourseChatScope } from "../../../shared/auth/courseChatStorage";
import type {
    CourseDefinition,
    CoursePageRequest,
    CourseAnswers,
    QuestionResponse,
    SubmittedAnswerResponse,
} from "../genetics/types/types";
import type {
    SimulationState,
    CCMSimulationStates,
} from "../player/presentation";

type Input = {
    definition: CourseDefinition;
    page: CoursePageRequest;
    scope?: CourseChatScope;
    answersByPage: Record<number, CourseAnswers>;
    submissions: SubmittedAnswerResponse[];
    simulation: SimulationState;
    simulations?: CCMSimulationStates;
};

export async function prepareMaterialMessage(
    text: string,
    input: Input
): Promise<string> {
    const preset = materialPreset(input.definition.code);
    if (!preset) return text;
    // Capture synchronous learner state before awaiting content, so one send is one snapshot.
    const {
        definition,
        page,
        scope,
        answersByPage,
        submissions,
        simulation,
        simulations,
    } = structuredClone(input);
    if (
        !scope?.account ||
        scope.courseId !== definition.id ||
        scope.pageId !== page.pageId ||
        !scope.experimentId
    )
        throw new Error("無法確認目前教材與登入身分，請重新載入。");
    if (
        page.request.type !== "material" ||
        !page.request.presentation?.chatEnabled
    )
        throw new Error("此頁不提供教材討論。");
    const capturedAt = new Date().toISOString();
    const readTextUncached = async (id: string) => {
        const data = await api<{ content: string }>(`/api/content/text/${id}`);
        if (typeof data.content !== "string")
            throw new Error("教材文字載入不完整，請重試。");
        return data.content;
    };
    const textCache = new Map<string, Promise<string>>();
    const readText = (id: string) => {
        if (!textCache.has(id)) textCache.set(id, readTextUncached(id));
        return textCache.get(id)!;
    };
    if (!page.contextTextIds?.length)
        throw new Error("教材缺少圖說與模擬說明，無法建立完整討論內容。");
    const [body, descriptions, questions, materialPages] = await Promise.all([
        readText(page.request.content.descriptionId),
        Promise.all(page.contextTextIds.map(readText)),
        Promise.all(
            definition.pages.flatMap((p) =>
                p.request.type === "material"
                    ? p.request.questionSections.map(async (section) => {
                          const q = await api<QuestionResponse>(
                              `/api/questions/${section.questionId}`
                          );
                          if (
                              q.id !== section.questionId ||
                              typeof q.content !== "string" ||
                              !["TEXT", "CHOICE"].includes(q.type)
                          )
                              throw new Error("教材題目載入不完整，請重試。");
                          const values = answersByPage[p.pageIndex] ?? {};
                          const draft = values[q.id];
                          const confirmed = submissions.find(
                              (a) =>
                                  a.questionId === q.id &&
                                  a.experimentId === scope.experimentId
                          );
                          const submitted =
                              confirmed?.textAnswer ??
                              confirmed?.selectedOptionId;
                          const answer: MaterialContext["snapshot"]["questions"][number]["answer"] =
                              {
                                  state:
                                      submitted !== undefined
                                          ? "submitted"
                                          : draft?.trim()
                                            ? "draft"
                                            : Object.hasOwn(values, q.id)
                                              ? "unanswered"
                                              : "unknown",
                                  submission:
                                      submitted !== undefined
                                          ? "confirmed_in_this_session"
                                          : "unknown",
                                  ...(draft !== undefined ? { draft } : {}),
                                  ...(submitted !== undefined
                                      ? { submitted }
                                      : {}),
                              };
                          return {
                              id: q.id,
                              pageId: p.pageId ?? String(p.pageIndex),
                              prompt: q.content,
                              type: q.type,
                              options:
                                  q.type === "CHOICE"
                                      ? q.options.map((o) => ({
                                            id: o.id,
                                            label: o.label,
                                            content: o.content,
                                        }))
                                      : [],
                              answer,
                          };
                      })
                    : []
            )
        ),
        definition.code === CCM_CODE
            ? Promise.all(
                  definition.pages.map(async (p) => {
                      if (
                          p.request.type !== "material" ||
                          !p.request.presentation ||
                          !p.contextTextIds?.length
                      )
                          throw new Error("教材分頁說明不完整，尚未送出討論。");
                      return {
                          id: p.pageId ?? String(p.pageIndex),
                          title: p.secondaryTitle,
                          stage: p.request.presentation.stage,
                          mentalSet: p.request.presentation.mentalSet,
                          simulationId: p.request.presentation.simulationId,
                          body: await readText(p.request.content.descriptionId),
                          descriptions: await Promise.all(
                              p.contextTextIds.map(readText)
                          ),
                      };
                  })
              )
            : undefined,
    ]);
    const context: MaterialContext = {
        version: 1,
        preset,
        snapshot: {
            capturedAt,
            course: {
                id: definition.id,
                code: definition.code,
                title: definition.title,
            },
            experimentId: scope.experimentId,
            page: {
                id: scope.pageId,
                title: page.secondaryTitle,
                stage: page.request.presentation.stage,
                body,
                descriptions,
                mentalSet: page.request.presentation.mentalSet,
            },
            questions,
            ...(materialPages ? { materialPages } : {}),
            ...(definition.code === CCM_CODE
                ? { simulations: simulations ?? {} }
                : page.request.presentation.simulationId
                  ? { simulation }
                  : {}),
        },
    };
    const message = encodeMaterialMessage(text, context);
    // A frontend safety budget, not a claim about any model's context window.
    if (new TextEncoder().encode(message).length > 64000)
        throw new Error("教材討論內容過長，尚未送出；請聯絡管理者。");
    return message;
}
