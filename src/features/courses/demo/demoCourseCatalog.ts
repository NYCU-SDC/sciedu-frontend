import brainManifest from "../../../../tools/brain-interface-course/course-manifest.json";
import direWolfManifest from "../../../../tools/dire-wolf-course/course-manifest.json";
import { coursePageRequests } from "../genetics/assets/courseResource";
import type {
    CourseDefinition,
    CoursePageRequest,
    QuestionResponse,
} from "../genetics/types/types";

export const DEMO_MODE =
    import.meta.env.MODE !== "test" &&
    import.meta.env.VITE_DEMO_MODE !== "false";

export type DemoCourseStatus = "done" | "in_progress" | "not_started";

export type DemoQuestionReview = {
    studentAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
    mockReply: string;
};

export type DemoCourse = {
    id: string;
    code: string;
    title: string;
    subject: string;
    isToday: boolean;
    status: DemoCourseStatus;
    completedPage: number;
    definition: CourseDefinition;
    summary: { correctCount: number; wrongCount: number; duration: string };
    reviews: Record<string, DemoQuestionReview>;
};

type Manifest = typeof brainManifest;

const textResources = new Map<string, string>();
const questionResources = new Map<string, QuestionResponse>();
const mediaResources = new Map<string, string>();

const demoUuid = (number: number) =>
    `10000000-0000-4000-8000-${String(number).padStart(12, "0")}`;

function buildManifestCourse(
    id: string,
    manifest: Manifest,
    resourceStart: number
): DemoCourse {
    let resourceNumber = resourceStart;
    const reviews: Record<string, DemoQuestionReview> = {};
    const pages: CoursePageRequest[] = manifest.pages.map((page, pageIndex) => {
        const descriptionId = demoUuid(resourceNumber++);
        textResources.set(descriptionId, page.description);
        const imageIds = page.images.map((image) => {
            const imageId = demoUuid(resourceNumber++);
            mediaResources.set(
                imageId,
                `/demo-courses/${manifest.course.code}/${image.file}`
            );
            return imageId;
        });
        const questionSections = page.questions.map((question) => {
            const titleId = demoUuid(resourceNumber++);
            const questionId = demoUuid(resourceNumber++);
            textResources.set(titleId, question.label);
            questionResources.set(questionId, {
                id: questionId,
                type: "TEXT",
                content: question.content,
                options: [],
            });
            reviews[questionId] = {
                studentAnswer:
                    "我認為這項結果需要結合教材中的證據，並考量技術限制與環境條件後才能判斷。",
                correctAnswer:
                    "答案應提出清楚主張，引用教材證據，並以合理的因果關係完成推論。",
                isCorrect: pageIndex % 3 !== 1,
                explanation: `本題需先辨認「${page.title}」教材中的核心證據，再說明證據如何支持主張。完整作答應同時交代科學機制、限制條件與可能的替代解釋。`,
                mockReply:
                    "可以先把教材中的觀察結果當作證據，再問自己：這個證據透過什麼科學機制支持你的主張？最後補上限制條件，就會形成完整論證。",
            };
            return { titleId, questionId };
        });

        return {
            pageIndex: pageIndex + 1,
            activeNavbarTitles: [pageIndex],
            secondaryTitle: page.title,
            request: {
                type: "material",
                content: { descriptionId, imageIds },
                questionSections,
            },
        };
    });

    const isBrain = manifest.course.code === "brain-computer-interface";
    return {
        id,
        code: manifest.course.code,
        title: manifest.course.title,
        subject: "生物科學",
        isToday: true,
        status: isBrain ? "in_progress" : "not_started",
        completedPage: isBrain ? 1 : 0,
        definition: {
            id,
            code: manifest.course.code,
            title: manifest.course.title,
            pages,
            navigation: "stepper",
        },
        summary: {
            correctCount: Object.values(reviews).filter(
                (item) => item.isCorrect
            ).length,
            wrongCount: Object.values(reviews).filter((item) => !item.isCorrect)
                .length,
            duration: isBrain ? "12:36" : "10:48",
        },
        reviews,
    };
}

const peaText: Record<string, string> = {
    "5736c96b-b9e8-4753-b8c2-6799c5793400":
        "孟德爾以豌豆進行雜交實驗，觀察親代與子代的性狀表現。基因的不同型態稱為等位基因；個體所具有的等位基因組合是基因型，實際觀察到的特徵則是表現型。當異型合子呈現介於兩種純合子之間的表現時，稱為不完全顯性。",
    "68932706-d76b-4b37-a553-f1ddb65305cb": "基因與等位基因",
    "aee6dafc-86e1-42c9-a34f-35e4061bbb5f": "基因型與表現型",
    "ddd365a2-a4db-4c6d-b8de-0a33ad92311a": "遺傳機制",
    "b3d185d0-78bd-4f76-b6ae-59e252407ef0": "請判斷下列敘述",
    "662d6569-3f4a-4781-9131-bb000ed10725": "問題一",
    "2b507ba1-c18d-427c-b496-7fcede4bd62c": "請說明理由",
    "dd9d1569-5c92-402a-bfdd-8424bf7e4cf5": "請運用證據推論",
    "aee3fc80-d5a4-4fb0-b64b-c051d8c0e6b1": "問題二",
    "dd664820-b2dc-4465-b3f9-1b135c94c51d": "請說明理由",
    "aff3b398-154d-4461-a905-2bbb88c3a4c1": "比較項目",
    "64ad5310-961a-4d4e-b06d-12fb3d26f6f8": "古典遺傳學",
    "b24bee75-f0c3-4235-af57-037fe4e618e0": "分子遺傳學",
};

const overviewIds = [
    "6ab5a883-2aa4-4081-814e-f51a16de744e",
    "07705483-5172-4bb6-b730-f6ac014d8712",
    "e96dca0f-edbe-4761-9eee-3b504829ef96",
    "58e81de6-03df-4f9f-90fa-33614731a53f",
    "e5aaf014-bb8c-4080-b40d-75f4af77e92a",
    "a5aabdc3-d226-477a-835c-c4421a40bc2d",
    "47cb570b-a4be-4d0c-9785-70015e70b0c0",
    "eafc8766-32a8-4d97-a72e-fa28013fe8f5",
    "7bcf95fb-4c7d-4fea-8331-9334696b59ff",
    "f594bd54-c7c2-4441-916e-dd331040671b",
    "81fb4a06-af67-43b5-b00e-df4a6a025dc2",
    "d450f3f2-c9f7-42fd-a6aa-3f6a262d0a74",
    "2086ed15-44ad-4e3d-a916-00cf7a6640ad",
    "17ad2972-99d8-4cbc-a280-9a48439e8569",
    "c6df3ba6-370e-4bd7-b976-9a4db1375df5",
    "19ac9748-e01d-42bb-90b9-cbb41aa425ed",
    "1e1ea32f-675c-46e0-a439-422f15492200",
    "1c0789ea-e33b-4de8-a167-3dc9b4292712",
];
const overviewCopy = [
    "基因位置",
    "由染色體上的遺傳因子推論",
    "由 DNA 序列與基因座分析",
    "性狀關係",
    "利用親子代表現歸納",
    "以蛋白質功能解釋表現型",
    "基因分類",
    "顯性、隱性與等位基因",
    "序列變異與功能差異",
    "單因子遺傳",
    "以分離律預測比例",
    "以減數分裂說明分離",
    "雙因子遺傳",
    "以獨立分配律預測",
    "以染色體排列說明分配",
    "不完全顯性",
    "異型合子呈現中間性狀",
    "基因產物劑量造成中間表現",
];
overviewIds.forEach((id, index) => {
    peaText[id] = overviewCopy[index];
});
Object.entries(peaText).forEach(([id, content]) =>
    textResources.set(id, content)
);

const peaQuestions: Array<[string, string, "CHOICE" | "TEXT", string]> = [
    [
        "978639ab-e186-48ad-8c17-8ff1eb24989e",
        "什麼是等位基因？",
        "TEXT",
        "等位基因是位於同一基因座、控制相同性狀但序列可能不同的基因型態。",
    ],
    [
        "debe705f-e63e-40d4-89da-d1ce5d91473f",
        "Rr 個體為什麼呈現粉紅花？",
        "TEXT",
        "Rr 只有一個能正常產生色素的 R，因此色素量介於 RR 與 rr 之間，呈現粉紅花。",
    ],
    [
        "bb935b9d-d983-4480-b32e-5c2f2639db2b",
        "這種遺傳現象稱為什麼？",
        "TEXT",
        "不完全顯性。",
    ],
    [
        "5b5586c7-a9fb-4063-9e16-88954747083d",
        "RR 與 rr 雜交的子代基因型為何？",
        "TEXT",
        "全部為 Rr。",
    ],
    [
        "a5426c54-4d5d-4bcf-a1eb-92cf6b2ef9be",
        "請說明你的推理。",
        "TEXT",
        "親代分別只能產生 R 與 r 配子，因此子代皆取得 Rr。",
    ],
    [
        "dc7bcc29-59cb-4217-8ba2-2070188199f6",
        "Rr 自交後可能出現哪些表現型？",
        "TEXT",
        "紅花、粉紅花與白花。",
    ],
    [
        "3ecf79d6-c213-402c-9687-241f6788150c",
        "請說明預測比例。",
        "TEXT",
        "基因型為 1 RR：2 Rr：1 rr，表現型也為 1：2：1。",
    ],
];

const peaReviews: Record<string, DemoQuestionReview> = {};
peaQuestions.forEach(([id, content, type, correctAnswer], index) => {
    questionResources.set(id, { id, content, type, options: [] });
    peaReviews[id] = {
        studentAnswer: index === 1 ? "因為 R 是顯性基因。" : correctAnswer,
        correctAnswer,
        isCorrect: index !== 1,
        explanation:
            index === 1
                ? "Rr 個體只有一個能正常產生色素的 R 基因，因此色素量少於 RR，但又不像 rr 完全沒有色素，所以呈現介於紅花與白花之間的粉紅花。這稱為不完全顯性。"
                : `本題可依等位基因分離及配子組合推得：${correctAnswer}`,
        mockReply:
            "Rr 個體只有一個能正常產生色素的 R 基因，因此色素量少於 RR，但又不像 rr 完全沒有色素，所以會呈現粉紅花。這種異型合子的表現介於兩種純合子之間，稱為不完全顯性。",
    };
});
mediaResources.set(
    "a969cdf3-17e7-4e4a-82cb-ed353401d824",
    "/demo-courses/genetics/pea-seed-shape.jpg"
);

const peaCourse: DemoCourse = {
    id: "00000000-0000-4000-8000-000000000003",
    code: "genetics",
    title: "豌豆－種皮形狀",
    subject: "遺傳學",
    isToday: true,
    status: "done",
    completedPage: 3,
    definition: {
        id: "00000000-0000-4000-8000-000000000003",
        code: "genetics",
        title: "豌豆－種皮形狀",
        pages: coursePageRequests,
        navigation: "classic",
    },
    summary: { correctCount: 6, wrongCount: 1, duration: "08:24" },
    reviews: peaReviews,
};

export const demoCourses: DemoCourse[] = [
    peaCourse,
    buildManifestCourse(
        "00000000-0000-4000-8000-000000000001",
        brainManifest,
        1000
    ),
    buildManifestCourse(
        "00000000-0000-4000-8000-000000000002",
        direWolfManifest as Manifest,
        2000
    ),
];

export function getDemoCourse(courseId: string) {
    return demoCourses.find(
        (course) => course.id === courseId || course.code === courseId
    );
}

export function getDemoText(id: string) {
    return textResources.get(id);
}

export function getDemoQuestion(id: string) {
    return questionResources.get(id);
}

export function getDemoMediaUrl(id: string) {
    return mediaResources.get(id);
}

export function getDemoApiResponse(path: string, options: RequestInit) {
    if (path === "/api/auth/session") {
        return {
            email: "demo.student@nycu.edu.tw",
            username: "Demo Student",
            accessTokenExpiresAt: new Date(
                Date.now() + 24 * 60 * 60 * 1000
            ).toISOString(),
            refreshTokenExpiresAt: new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000
            ).toISOString(),
        };
    }

    const textMatch = path.match(/^\/api\/content\/text\/([^/]+)$/);
    if (textMatch) {
        const content = getDemoText(textMatch[1]);
        return content === undefined
            ? undefined
            : { id: textMatch[1], content };
    }

    const questionMatch = path.match(/^\/api\/questions\/([^/]+)$/);
    if (questionMatch && (!options.method || options.method === "GET")) {
        return getDemoQuestion(questionMatch[1]);
    }

    const answerMatch = path.match(/^\/api\/questions\/([^/]+)\/answers$/);
    if (answerMatch && options.method === "POST") {
        const payload = JSON.parse(String(options.body ?? "{}")) as {
            selectedOptionId?: string;
            textAnswer?: string;
        };
        return {
            id: demoUuid(Date.now() % 1_000_000_000),
            questionId: answerMatch[1],
            selectedOptionId: payload.selectedOptionId,
            textAnswer: payload.textAnswer,
            createdAt: new Date().toISOString(),
        };
    }

    return undefined;
}
