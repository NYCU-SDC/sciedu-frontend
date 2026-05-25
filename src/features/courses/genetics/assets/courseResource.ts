import type { CoursePageRequest } from "../types/types";

export const coursePageRequests: CoursePageRequest[] = [
    {
        activeNavbarTitles: [0, 1],
        secondaryTitle: "整合問題",
        pageIndex: 1,
        request: {
            type: "material",
            content: {
                imageId: "genetics_material_1",
                descriptionId: "genetics_material_desc_1",
            },
            questionIds: ["q1", "q2"],
        },
    },
];
