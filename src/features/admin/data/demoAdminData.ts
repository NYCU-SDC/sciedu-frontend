import type {
    ExperimentCourseAssignment,
    ExperimentDetail,
    ExperimentParticipantAssignment,
    User,
    UserRole,
} from "../types";

export const DEMO_EXPERIMENT_ID = "7d537da5-a788-474c-b7d0-d5dc4c3a9c6d";

const createdAt = "2026-06-01T09:00:00+08:00";
const updatedAt = "2026-07-01T09:00:00+08:00";

export const demoCurrentUser: User = {
    id: "00000000-0000-4000-8000-000000000013",
    name: "王小明",
    email: "xiaoming.wang@nycu.edu.tw",
    roles: ["EXPERIMENTER"],
    createdAt,
    updatedAt,
};

export const demoExperiment: ExperimentDetail = {
    id: DEMO_EXPERIMENT_ID,
    name: "遺傳機制推理學習實驗",
    description:
        "觀察學生如何使用互動教材理解孟德爾遺傳規律，並分析其推理與作答歷程。",
    status: "ACTIVE",
    scheduledStartAt: "2026-07-01T09:00:00+08:00",
    scheduledEndAt: "2026-07-31T18:00:00+08:00",
    configuration: {
        maxAttempts: 2,
        allowRetry: true,
        showScore: true,
        showExplanations: true,
        gradingMode: "AUTOMATIC",
        correctAnswerReleaseMode: "AFTER_COURSE_COMPLETION",
    },
    createdBy: demoCurrentUser.id,
    createdAt,
    updatedAt,
    participantCount: 12,
    courseCount: 4,
};

const people = [
    ["陳小明", "xiaoming.chen@nycu.edu.tw", ["STUDENT"]],
    ["林怡君", "yijun.lin@nycu.edu.tw", ["STUDENT"]],
    ["王冠宇", "guanyu.wang@nycu.edu.tw", ["STUDENT"]],
    ["張雅婷", "yating.chang@nycu.edu.tw", ["STUDENT"]],
    ["李承翰", "chenghan.li@nycu.edu.tw", ["STUDENT"]],
    ["黃品妤", "pinyu.huang@nycu.edu.tw", ["STUDENT"]],
    ["吳柏廷", "boting.wu@nycu.edu.tw", ["STUDENT"]],
    ["劉思妤", "siyu.liu@nycu.edu.tw", ["STUDENT"]],
    ["蔡宗翰", "zonghan.tsai@nycu.edu.tw", ["STUDENT"]],
    ["楊舒涵", "shuhan.yang@nycu.edu.tw", ["STUDENT"]],
    ["周奕辰", "yichen.chou@nycu.edu.tw", ["STUDENT"]],
    ["鄭育誠", "yucheng.cheng@nycu.edu.tw", ["STUDENT"]],
] as const satisfies readonly (readonly [
    string,
    string,
    readonly UserRole[],
])[];

export const demoParticipants: ExperimentParticipantAssignment[] = people.map(
    ([name, email, roles], index) => ({
        participant: {
            id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
            name,
            email,
            roles: [...roles],
            createdAt,
            updatedAt,
        },
        assignedAt: `2026-06-${String(index + 1).padStart(2, "0")}T09:00:00+08:00`,
    })
);

export const demoCourses: ExperimentCourseAssignment[] = [
    {
        course: {
            id: "10000000-0000-4000-8000-000000000001",
            code: "GEN-01",
            title: "遺傳機制推理學習",
            description: "生物學・3 頁",
            status: "PUBLISHED",
            createdAt,
            updatedAt,
        },
        linkedAt: "2026-06-10T09:00:00+08:00",
    },
    {
        course: {
            id: "10000000-0000-4000-8000-000000000002",
            code: "GEN-02",
            title: "孟德爾遺傳與機率",
            description: "生物學・4 頁",
            status: "PUBLISHED",
            createdAt,
            updatedAt,
        },
        linkedAt: "2026-06-10T09:05:00+08:00",
    },
    {
        course: {
            id: "10000000-0000-4000-8000-000000000003",
            code: "GEN-03",
            title: "基因表現與環境",
            description: "生物學・3 頁",
            status: "PUBLISHED",
            createdAt,
            updatedAt,
        },
        linkedAt: "2026-06-10T09:10:00+08:00",
    },
    {
        course: {
            id: "10000000-0000-4000-8000-000000000004",
            code: "GEN-04",
            title: "DNA 萃取實驗",
            description: "生物學・2 頁",
            status: "DRAFT",
            createdAt,
            updatedAt,
        },
        linkedAt: "2026-06-10T09:15:00+08:00",
    },
];

export const demoCandidateUsers: User[] = [
    ["謝小明", "example@gmail.com"],
    ["陳佳穎", "jiaying.chen@gmail.com"],
    ["林品妍", "pinyan.lin@gmail.com"],
    ["吳宇翔", "yuxiang.wu@gmail.com"],
    ["李小華", "sample123@yahoo.com"],
    ["王大明", "test456@hotmail.com"],
    ["張李小美", "example123@gmail.com"],
    ["張偉", "info789@yahoo.com"],
].map(([name, email], index) => ({
    id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    name,
    email,
    roles: ["STUDENT"],
    createdAt,
    updatedAt,
}));
