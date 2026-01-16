type PageType = "material" | "questions" | "overview";

type CoursePage = {
    type: PageType;
    title: string;
};

type Questions = {
    type: "Questions";
    content: {
        questions: string[];
    };
};

type Material = {
    type: "Material";
    content: {
        description: string;
        questions: string[];
    };
};

type Overview = {
    type: "Overview";
    content: {
        title: string;
        classical: string;
        material: string;
    };
};

type CourseContent = Questions | Material | Overview;

export type {
    PageType,
    CoursePage,
    Questions,
    Material,
    Overview,
    CourseContent,
};
