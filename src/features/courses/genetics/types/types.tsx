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
        image: string;
        description: string;
        questionSections: MaterialQuestionSection[];
    };
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

export type QuestionsType = {
    type: "questions";
    content: {
        columns: {
            label: string;
            questions: QuestionResponse[];
        }[];
    };
};

export type NavbarType = {
    MainTitle: string;
    SubTitle: string[];
};

export type CourseContent = (QuestionsType | MaterialType | OverviewType) & {
    activeNavbarTitles: number[];
    secondaryTitle: string;
};
