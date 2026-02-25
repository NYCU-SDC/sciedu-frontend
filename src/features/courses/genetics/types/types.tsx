export type QuestionsType = {
    type: "questions";
    content: {
        label: string[];
        questions: {
            questions: string[][];
        };
    };
};

export type MaterialType = {
    type: "material";
    content: {
        image: string;
        description: string;
        questions: {
            label: string[];
            questions: string[];
            options: string[][];
        };
    };
};

export type OverviewType = {
    type: "overview";
    content: {
        label: string[];
        rows: {
            title: string[];
            classical: string[];
            material: string[];
        };
    };
};

export type NavbarType = {
    MainTitle: string;
    SubTitle: string[];
    SecondTitle: string[];
};

export type CourseContent = QuestionsType | MaterialType | OverviewType;
