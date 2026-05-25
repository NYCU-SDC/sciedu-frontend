import type { CoursePageRequest } from "../types/types";

const TEXT_ID = "05dd18a7-95f1-4c42-8d23-5684bb321499";
const QUESTION_ID = "a06945db-a86b-47d6-853c-798c99bb4307";

export const coursePageRequests: CoursePageRequest[] = [
    {
        activeNavbarTitles: [0, 1],
        secondaryTitle: "碗豆-種皮形狀",
        pageIndex: 1,
        request: {
            type: "material",
            content: {
                imageId: "7499de8e-1b0c-4da9-967d-952f735a35ad",
                descriptionId: TEXT_ID,
            },
            questionSections: [
                {
                    titleId: TEXT_ID,
                    questionId: "a06945db-a86b-47d6-853c-798c99bb4307",
                },
                {
                    titleId: TEXT_ID,
                    questionId: QUESTION_ID,
                },
                { titleId: TEXT_ID, questionId: QUESTION_ID },
            ],
        },
    },
    {
        activeNavbarTitles: [0, 1],
        secondaryTitle: "整合問題",
        pageIndex: 2,
        request: {
            type: "questions",
            columns: [
                {
                    labelId: TEXT_ID,
                    questions: [
                        {
                            titleId: TEXT_ID,
                            questionId: "ec02c01f-0106-45b7-8f3a-b495375b3039",
                        },
                        { titleId: TEXT_ID, questionId: QUESTION_ID },
                    ],
                },
                {
                    labelId: TEXT_ID,
                    questions: [
                        { titleId: TEXT_ID, questionId: QUESTION_ID },
                        { titleId: TEXT_ID, questionId: QUESTION_ID },
                    ],
                },
            ],
        },
    },
    {
        activeNavbarTitles: [],
        secondaryTitle: "整合",
        pageIndex: 3,
        request: {
            type: "overview",
            headerId: [TEXT_ID, TEXT_ID, TEXT_ID],
            contentId: [
                [TEXT_ID, TEXT_ID, TEXT_ID],
                [TEXT_ID, TEXT_ID, TEXT_ID],
                [TEXT_ID, TEXT_ID, TEXT_ID],
                [TEXT_ID, TEXT_ID, TEXT_ID],
                [TEXT_ID, TEXT_ID, TEXT_ID],
                [TEXT_ID, TEXT_ID, TEXT_ID],
            ],
        },
    },
];
