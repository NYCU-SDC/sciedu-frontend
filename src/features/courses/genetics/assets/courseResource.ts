import type { CoursePageRequest } from "../types/types";

const IMAGE_ID = "a0c2e005-ba0a-4e33-8c09-3c34e29510be";

const TEXT_LOREM = "0412d65f-9902-4a92-b388-6fa67bb4636e";
const TEXT_GENE = "60683ebd-babf-4a20-be37-9cbc6de6ca73";
const TEXT_PHENOTYPE = "1b2adf9c-8e32-4ac4-8e7d-c1051d023813";
const TEXT_MECHANISM = "59ed42ae-af30-4e06-b446-8008de36df14";
const TEXT_SECTION_TITLE = "17161c49-24de-497e-8b05-4df2b9112058";
const TEXT_CLASSICAL_GENETICS = "8def5387-37b4-49e2-9c02-ee1ebf0e5d35";
const TEXT_MOLECULAR_GENETICS = "3873fe9a-b9c4-4373-8345-9f571825002c";
const TEXT_GENE_LOCATION = "05addc4c-4c48-4ce1-ba9c-a153284fb07e";
const TEXT_GENE_TRAIT_RELATION = "03654059-a263-4151-a050-8d853e5c8da5";
const TEXT_GENE_CLASSIFICATION = "83d00ec3-e274-41f7-8b0f-faa7018e2119";
const TEXT_ONE_PAIR_MECHANISM = "a1679a7b-10c6-4980-89a6-3aaea708ec4b";
const TEXT_TWO_PAIR_MECHANISM = "09c20fa7-6d12-4762-9d61-0762f1139502";
const TEXT_INCOMPLETE_DOMINANCE = "49314887-e080-4673-9321-18d13ffe40c9";
const TEXT_QUESTION_TITLE = "0663b695-d368-48d3-aa37-1ebd2250e26e";

const QUESTION_FLOWER_GENE = "0e9582bd-7e23-4ddc-ae31-1912b71d5869";
const QUESTION_RR_COLOR = "1325c9a3-2ef8-4721-84b7-e29bed7e59d3";
const QUESTION_1 = "1e1f85c9-df8e-496b-a14a-6ffdb39dec63";
const QUESTION_2 = "7711d128-52f9-48ca-a864-5ba40ab15c91";
const QUESTION_3 = "092a3515-f4bb-4ae0-9379-38d7d440a29c";
const QUESTION_4 = "083d8b7f-f10a-4a12-ad0e-e38545ef4e47";

export const coursePageRequests: CoursePageRequest[] = [
    {
        activeNavbarTitles: [0, 1],
        secondaryTitle: "碗豆-種皮形狀",
        pageIndex: 1,
        request: {
            type: "material",
            content: {
                imageId: IMAGE_ID,
                descriptionId: TEXT_LOREM,
            },
            questionSections: [
                { titleId: TEXT_GENE, questionId: QUESTION_FLOWER_GENE },
                { titleId: TEXT_PHENOTYPE, questionId: QUESTION_RR_COLOR },
                { titleId: TEXT_MECHANISM, questionId: QUESTION_1 },
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
                    labelId: TEXT_QUESTION_TITLE,
                    questions: [
                        {
                            titleId: TEXT_QUESTION_TITLE,
                            questionId: QUESTION_1,
                        },
                        {
                            titleId: TEXT_QUESTION_TITLE,
                            questionId: QUESTION_2,
                        },
                    ],
                },
                {
                    labelId: TEXT_QUESTION_TITLE,
                    questions: [
                        {
                            titleId: TEXT_QUESTION_TITLE,
                            questionId: QUESTION_3,
                        },
                        {
                            titleId: TEXT_QUESTION_TITLE,
                            questionId: QUESTION_4,
                        },
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
            headerId: [
                TEXT_SECTION_TITLE,
                TEXT_CLASSICAL_GENETICS,
                TEXT_MOLECULAR_GENETICS,
            ],
            contentId: [
                [TEXT_GENE_LOCATION, TEXT_LOREM, TEXT_LOREM],
                [TEXT_GENE_TRAIT_RELATION, TEXT_LOREM, TEXT_LOREM],
                [TEXT_GENE_CLASSIFICATION, TEXT_LOREM, TEXT_LOREM],
                [TEXT_ONE_PAIR_MECHANISM, TEXT_LOREM, TEXT_LOREM],
                [TEXT_TWO_PAIR_MECHANISM, TEXT_LOREM, TEXT_LOREM],
                [TEXT_INCOMPLETE_DOMINANCE, TEXT_LOREM, TEXT_LOREM],
            ],
        },
    },
];
