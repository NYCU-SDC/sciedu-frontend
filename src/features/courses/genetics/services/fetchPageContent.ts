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
                ],
                question: request.questionIds,
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
                content: request.columns.map((col) => ({
                    type: "text",
                    id: col.labelId,
                })),
                question: request.columns.flatMap((col) => col.questionIds),
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
