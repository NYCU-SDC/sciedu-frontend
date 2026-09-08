import type { CoursePageRequest } from "../types/types";

const PAGE_1_IMAGE = "a969cdf3-17e7-4e4a-82cb-ed353401d824";
const PAGE_1_DESCRIPTION = "5736c96b-b9e8-4753-b8c2-6799c5793400";
const PAGE_1_TEXT_GENE = "68932706-d76b-4b37-a553-f1ddb65305cb";
const PAGE_1_TEXT_PHENOTYPE = "aee6dafc-86e1-42c9-a34f-35e4061bbb5f";
const PAGE_1_TEXT_MECHANISM = "ddd365a2-a4db-4c6d-b8de-0a33ad92311a";
const PAGE_1_QUESTION_GENE = "978639ab-e186-48ad-8c17-8ff1eb24989e";
const PAGE_1_QUESTION_PHENOTYPE = "debe705f-e63e-40d4-89da-d1ce5d91473f";
const PAGE_1_QUESTION_MECHANISM = "bb935b9d-d983-4480-b32e-5c2f2639db2b";

const PAGE_2_TEXT_LEFT_COLUMN = "b3d185d0-78bd-4f76-b6ae-59e252407ef0";
const PAGE_2_TEXT_QUESTION_1 = "662d6569-3f4a-4781-9131-bb000ed10725";
const PAGE_2_TEXT_QUESTION_1_REASON = "2b507ba1-c18d-427c-b496-7fcede4bd62c";
const PAGE_2_TEXT_RIGHT_COLUMN = "dd9d1569-5c92-402a-bfdd-8424bf7e4cf5";
const PAGE_2_TEXT_QUESTION_2 = "aee3fc80-d5a4-4fb0-b64b-c051d8c0e6b1";
const PAGE_2_TEXT_QUESTION_2_REASON = "dd664820-b2dc-4465-b3f9-1b135c94c51d";
const PAGE_2_QUESTION_1 = "5b5586c7-a9fb-4063-9e16-88954747083d";
const PAGE_2_QUESTION_1_REASON = "a5426c54-4d5d-4bcf-a1eb-92cf6b2ef9be";
const PAGE_2_QUESTION_2 = "dc7bcc29-59cb-4217-8ba2-2070188199f6";
const PAGE_2_QUESTION_2_REASON = "3ecf79d6-c213-402c-9687-241f6788150c";

const PAGE_3_TEXT_COMPARISON_HEADER = "aff3b398-154d-4461-a905-2bbb88c3a4c1";
const PAGE_3_TEXT_CLASSICAL_HEADER = "64ad5310-961a-4d4e-b06d-12fb3d26f6f8";
const PAGE_3_TEXT_MOLECULAR_HEADER = "b24bee75-f0c3-4235-af57-037fe4e618e0";
const PAGE_3_TEXT_GENE_POSITION_LABEL = "6ab5a883-2aa4-4081-814e-f51a16de744e";
const PAGE_3_TEXT_GENE_POSITION_CLASSICAL =
    "07705483-5172-4bb6-b730-f6ac014d8712";
const PAGE_3_TEXT_GENE_POSITION_MOLECULAR =
    "e96dca0f-edbe-4761-9eee-3b504829ef96";
const PAGE_3_TEXT_GENE_TRAIT_LABEL = "58e81de6-03df-4f9f-90fa-33614731a53f";
const PAGE_3_TEXT_GENE_TRAIT_CLASSICAL = "e5aaf014-bb8c-4080-b40d-75f4af77e92a";
const PAGE_3_TEXT_GENE_TRAIT_MOLECULAR = "a5aabdc3-d226-477a-835c-c4421a40bc2d";
const PAGE_3_TEXT_CLASSIFICATION_LABEL = "47cb570b-a4be-4d0c-9785-70015e70b0c0";
const PAGE_3_TEXT_CLASSIFICATION_CLASSICAL =
    "eafc8766-32a8-4d97-a72e-fa28013fe8f5";
const PAGE_3_TEXT_CLASSIFICATION_MOLECULAR =
    "7bcf95fb-4c7d-4fea-8331-9334696b59ff";
const PAGE_3_TEXT_ONE_PAIR_LABEL = "f594bd54-c7c2-4441-916e-dd331040671b";
const PAGE_3_TEXT_ONE_PAIR_CLASSICAL = "81fb4a06-af67-43b5-b00e-df4a6a025dc2";
const PAGE_3_TEXT_ONE_PAIR_MOLECULAR = "d450f3f2-c9f7-42fd-a6aa-3f6a262d0a74";
const PAGE_3_TEXT_TWO_PAIRS_LABEL = "2086ed15-44ad-4e3d-a916-00cf7a6640ad";
const PAGE_3_TEXT_TWO_PAIRS_CLASSICAL = "17ad2972-99d8-4cbc-a280-9a48439e8569";
const PAGE_3_TEXT_TWO_PAIRS_MOLECULAR = "c6df3ba6-370e-4bd7-b976-9a4db1375df5";
const PAGE_3_TEXT_INHERITANCE_LABEL = "19ac9748-e01d-42bb-90b9-cbb41aa425ed";
const PAGE_3_TEXT_INHERITANCE_CLASSICAL =
    "1e1ea32f-675c-46e0-a439-422f15492200";
const PAGE_3_TEXT_INHERITANCE_MOLECULAR =
    "1c0789ea-e33b-4de8-a167-3dc9b4292712";

export const coursePageRequests: CoursePageRequest[] = [
    {
        activeNavbarTitles: [0, 1],
        secondaryTitle: "碗豆-種皮形狀",
        pageIndex: 1,
        request: {
            type: "material",
            content: {
                imageId: PAGE_1_IMAGE,
                descriptionId: PAGE_1_DESCRIPTION,
            },
            questionSections: [
                {
                    titleId: PAGE_1_TEXT_GENE,
                    questionId: PAGE_1_QUESTION_GENE,
                },
                {
                    titleId: PAGE_1_TEXT_PHENOTYPE,
                    questionId: PAGE_1_QUESTION_PHENOTYPE,
                },
                {
                    titleId: PAGE_1_TEXT_MECHANISM,
                    questionId: PAGE_1_QUESTION_MECHANISM,
                },
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
                    labelId: PAGE_2_TEXT_LEFT_COLUMN,
                    questions: [
                        {
                            titleId: PAGE_2_TEXT_QUESTION_1,
                            questionId: PAGE_2_QUESTION_1,
                        },
                        {
                            titleId: PAGE_2_TEXT_QUESTION_1_REASON,
                            questionId: PAGE_2_QUESTION_1_REASON,
                        },
                    ],
                },
                {
                    labelId: PAGE_2_TEXT_RIGHT_COLUMN,
                    questions: [
                        {
                            titleId: PAGE_2_TEXT_QUESTION_2,
                            questionId: PAGE_2_QUESTION_2,
                        },
                        {
                            titleId: PAGE_2_TEXT_QUESTION_2_REASON,
                            questionId: PAGE_2_QUESTION_2_REASON,
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
                PAGE_3_TEXT_COMPARISON_HEADER,
                PAGE_3_TEXT_CLASSICAL_HEADER,
                PAGE_3_TEXT_MOLECULAR_HEADER,
            ],
            contentId: [
                [
                    PAGE_3_TEXT_GENE_POSITION_LABEL,
                    PAGE_3_TEXT_GENE_POSITION_CLASSICAL,
                    PAGE_3_TEXT_GENE_POSITION_MOLECULAR,
                ],
                [
                    PAGE_3_TEXT_GENE_TRAIT_LABEL,
                    PAGE_3_TEXT_GENE_TRAIT_CLASSICAL,
                    PAGE_3_TEXT_GENE_TRAIT_MOLECULAR,
                ],
                [
                    PAGE_3_TEXT_CLASSIFICATION_LABEL,
                    PAGE_3_TEXT_CLASSIFICATION_CLASSICAL,
                    PAGE_3_TEXT_CLASSIFICATION_MOLECULAR,
                ],
                [
                    PAGE_3_TEXT_ONE_PAIR_LABEL,
                    PAGE_3_TEXT_ONE_PAIR_CLASSICAL,
                    PAGE_3_TEXT_ONE_PAIR_MOLECULAR,
                ],
                [
                    PAGE_3_TEXT_TWO_PAIRS_LABEL,
                    PAGE_3_TEXT_TWO_PAIRS_CLASSICAL,
                    PAGE_3_TEXT_TWO_PAIRS_MOLECULAR,
                ],
                [
                    PAGE_3_TEXT_INHERITANCE_LABEL,
                    PAGE_3_TEXT_INHERITANCE_CLASSICAL,
                    PAGE_3_TEXT_INHERITANCE_MOLECULAR,
                ],
            ],
        },
    },
];
