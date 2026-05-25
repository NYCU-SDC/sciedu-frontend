import type { CoursePageRequest } from "../types/types";

export function generateRQRequestFromPage({ request }: CoursePageRequest): {
    queryKey: string[];
    queryPath: string;
}[] {
    let request_raw: {
        content: { type: "media" | "text"; id: string }[];
        question: string[];
    };
    switch (request.type) {
        case "material":
            request_raw = {
                content: [
                    { type: "text", id: request.content.descriptionId },
                    { type: "media", id: request.content.imageId },
                    ...request.questionSections.map(
                        (section) =>
                            ({ type: "text", id: section.titleId }) as const
                    ),
                ],
                question: request.questionSections.map(
                    (section) => section.questionId
                ),
            };
            break;
        case "overview":
            request_raw = {
                content: [
                    ...request.headerId.map(
                        (id) => ({ type: "text", id }) as const
                    ),
                    ...request.contentId
                        .flat()
                        .flat()
                        .map((id) => ({ type: "text", id }) as const),
                ],
                question: [],
            };
            break;
        case "questions":
            request_raw = {
                content: [
                    ...request.columns.map(
                        (col) => ({ type: "text", id: col.labelId }) as const
                    ),
                    ...request.columns.flatMap((col) =>
                        col.questions.map(
                            (q) => ({ type: "text", id: q.titleId }) as const
                        )
                    ),
                ],
                question: request.columns.flatMap((col) =>
                    col.questions.map((q) => q.questionId)
                ),
            };
            break;
        default:
            request_raw = { content: [], question: [] };
            console.warn("Unknown page request type:", request);
    }

    const contentRequests = request_raw.content.map(({ type, id }) => ({
        queryKey: ["content", type, id],
        queryPath: `/api/content/${type}/${id}`,
    }));
    const questionRequests = request_raw.question.map((id) => ({
        queryKey: ["question", id],
        queryPath: `/api/questions/${id}`,
    }));

    return [...contentRequests, ...questionRequests];
}
