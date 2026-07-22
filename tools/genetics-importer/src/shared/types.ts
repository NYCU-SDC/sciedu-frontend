export const UNIT_ORDER = [
    "T",
    "1",
    "2",
    "3",
    "4",
    "1S",
    "5",
    "6",
    "7",
    "8",
    "2S",
    "F",
] as const;

export type Approval = {
    reviewer: string;
    reviewedAt: string;
    approvalHash: string;
};

export type TextField = {
    key: string;
    text: string;
    sourceNote?: string;
};

export type QuestionField = {
    key: string;
    tag: string;
    type: "CHOICE" | "TEXT";
    content: string;
    options?: { label: string; content: string }[];
};

type PageBase = {
    id: string;
    secondaryTitle: string;
    activeNavbarTitles: number[];
    approvals: {
        content?: Approval;
        frontend?: Approval;
    };
};

export type MaterialManifestPage = PageBase & {
    type: "material";
    imageKey: string;
    image?: {
        fileName: string;
        sha256: string;
        width: number;
        height: number;
    };
    description: TextField;
    questionSections: {
        title: TextField;
        question: QuestionField;
    }[];
};

export type QuestionsManifestPage = PageBase & {
    type: "questions";
    columns: {
        label: TextField;
        questions: { title: TextField; question: QuestionField }[];
    }[];
};

export type OverviewManifestPage = PageBase & {
    type: "overview";
    headers: TextField[];
    rows: TextField[][];
};

export type ManifestPage =
    | MaterialManifestPage
    | QuestionsManifestPage
    | OverviewManifestPage;

export type CourseUnit = {
    id: string;
    title: string;
    category: string;
    order: number;
    pages: ManifestPage[];
};

export type GeneticsManifest = {
    version: 2;
    course: {
        id: "genetics";
        title: string;
        unitOrder: string[];
    };
    authoring: {
        mode: "manual";
    };
    units: CourseUnit[];
};

export type ResourceKind = "media" | "text" | "question";

export type PublishedResource = {
    kind: ResourceKind;
    id: string;
    contentHash: string;
    status: "verified" | "failed";
    createdAt: string;
};

export type PublishState = {
    version: 1;
    environment: "local" | "dev";
    baseUrl: string;
    manifestHash: string;
    resources: Record<string, PublishedResource>;
};
