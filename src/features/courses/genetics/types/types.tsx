export type MaterialType = {
    type: "material";
    content: {
        image: string;
        description: string;
        title: string[];
        questions: string[];
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
            questions: string[];
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

export type QuestionResponse = {
    id: string;
    type: "CHOICE" | "TEXT";
    content: string;
    options: string[];
};
