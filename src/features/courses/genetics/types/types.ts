export type MaterialQuestionSection = {
    title: string;
    questionContent: QuestionResponse;
};

export type QuestionResponse = {
    id: string;
    type: "CHOICE" | "TEXT";
    content: string;
    options: string[];
};

export type MaterialType = {
    type: "material";
    content: {
        imageId: string;
        descriptionId: string;
        questionSections: MaterialQuestionSection[];
    };
};

export type MaterialPage = {
    type: "material";
    content: {
        imageId: string;
        descriptionId: string;
    };
    questionIds: string[];
};

export type OverviewType = {
    type: "overview";
    content: {
        header: string[];
        content: string[][];
    };
    styling?: {
        titleColumn?: boolean;
        ratio?: number[];
    };
};

export type OverviewPage = {
    type: "overview";
    headerId: string[];
    contentId: string[][];
};

export type QuestionsType = {
    type: "questions";
    content: {
        columns: {
            label: string;
            questions: QuestionResponse[];
        }[];
    };
};

export type QuestionPage = {
    type: "questions";
    columns: {
        labelId: string;
        questionIds: string[];
    }[];
};

export type NavbarType = {
    MainTitle: string;
    SubTitle: string[];
};

export type CourseContent = (QuestionsType | MaterialType | OverviewType) & {
    activeNavbarTitles: number[];
    secondaryTitle: string;
};

export type CoursePageRequest = {
    pageIndex: number;
    request: MaterialPage | OverviewPage | QuestionPage;
    activeNavbarTitles: number[];
    secondaryTitle: string;
};
