export type QuestionsType = {
    type: "questions";
    content: {
        label: string[];
        questions: {
            questions: string[][];
        };
    };
};

type MaterialQuestionBase = {
    title: string;
    description: string;
};

type MaterialQuestionSelect = MaterialQuestionBase & {
    type: "select";
    options: string[];
};

type MaterialQuestionText = MaterialQuestionBase & {
    type: "text";
};

export type MaterialType = {
    type: "material";
    content: {
        image: string;
        description: string;
        questions: (MaterialQuestionSelect | MaterialQuestionText)[];
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

export type NavbarType = {
    MainTitle: string;
    SubTitle: string[];
    SecondTitle: string[];
};

export type CourseContent = QuestionsType | MaterialType | OverviewType;
