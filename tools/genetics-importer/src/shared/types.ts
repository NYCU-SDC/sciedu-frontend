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

export type CropRect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

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
    type: "CHOICE" | "TEXT";
    content: string;
    options?: { label: string; content: string }[];
};

type PageBase = {
    id: string;
    sourceImage: string;
    sourceHash: string;
    secondaryTitle: string;
    activeNavbarTitles: number[];
    ocrDraft?: OcrObservation[];
    approvals: {
        content?: Approval;
        frontend?: Approval;
    };
};

export type OcrObservation = {
    text: string;
    confidence: number;
    bounds: CropRect;
};

export type MaterialManifestPage = PageBase & {
    type: "material";
    crop: CropRect;
    imageKey: string;
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
    version: 1;
    course: {
        id: "genetics";
        title: string;
        unitOrder: string[];
    };
    source: {
        archiveName: string;
        archiveSha256: string;
        imageWidth: 1920;
        imageHeight: 1080;
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
