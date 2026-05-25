export type ParsedAssistantContent = {
    answer: string;
    thought: string;
    isThinking: boolean;
};

const THINK_OPEN_TAG = "<think>";
const THINK_CLOSE_TAG = "</think>";

export function parseAssistantContent(
    content: string
): ParsedAssistantContent {
    const answerParts: string[] = [];
    const thoughtParts: string[] = [];
    let cursor = 0;
    let hasThinkTag = false;
    let isThinking = false;

    while (cursor < content.length) {
        const openIndex = content.indexOf(THINK_OPEN_TAG, cursor);

        if (openIndex === -1) {
            answerParts.push(content.slice(cursor));
            break;
        }

        hasThinkTag = true;
        answerParts.push(content.slice(cursor, openIndex));

        const thoughtStart = openIndex + THINK_OPEN_TAG.length;
        const closeIndex = content.indexOf(THINK_CLOSE_TAG, thoughtStart);

        if (closeIndex === -1) {
            const partialThoughtContent = content.slice(thoughtStart).trim();

            if (partialThoughtContent) {
                thoughtParts.push(partialThoughtContent);
            }

            isThinking = true;
            break;
        }

        const thoughtContent = content.slice(thoughtStart, closeIndex).trim();

        if (thoughtContent) {
            thoughtParts.push(thoughtContent);
        }

        cursor = closeIndex + THINK_CLOSE_TAG.length;
    }

    return {
        answer: hasThinkTag ? answerParts.join("").trim() : content,
        thought: thoughtParts.join("\n\n"),
        isThinking,
    };
}
