import type {
    AdminOverview,
    MaterialProgress,
    ParticipantCandidate,
    ParticipantProgress,
    UserRole,
} from "../types";

export const DEMO_EXPERIMENT_ID = "7d537da5-a788-474c-b7d0-d5dc4c3a9c6d";

export const demoOverview: AdminOverview = {
    experiment: {
        id: DEMO_EXPERIMENT_ID,
        name: "遺傳機制推理學習實驗",
        description:
            "觀察學生如何使用互動教材理解孟德爾遺傳規律，並分析其推理與作答歷程。",
        status: "ACTIVE",
        startAt: "2026-07-01T09:00:00+08:00",
        endAt: "2026-07-31T18:00:00+08:00",
        location: "國立陽明交通大學",
        mode: "sci-arg",
    },
    summary: {
        participantCount: 32,
        materialCount: 4,
        remainingSeconds: 21 * 24 * 60 * 60,
    },
};

const people = [
    [
        "陳小明",
        "xiaoming.chen@nycu.edu.tw",
        "STUDENT",
        1,
        "2026-07-01T10:32:00+08:00",
    ],
    ["林怡君", "yijun.lin@nycu.edu.tw", "STUDENT", 0, null],
    [
        "王冠宇",
        "guanyu.wang@nycu.edu.tw",
        "STUDENT",
        4,
        "2026-07-01T09:18:00+08:00",
    ],
    [
        "張雅婷",
        "yating.chang@nycu.edu.tw",
        "STUDENT",
        2,
        "2026-07-02T14:05:00+08:00",
    ],
    [
        "李承翰",
        "chenghan.li@nycu.edu.tw",
        "STUDENT",
        1,
        "2026-07-03T11:20:00+08:00",
    ],
    [
        "黃品妤",
        "pinyu.huang@nycu.edu.tw",
        "STUDENT",
        3,
        "2026-07-03T13:42:00+08:00",
    ],
    [
        "吳柏廷",
        "boting.wu@nycu.edu.tw",
        "STUDENT",
        1,
        "2026-07-04T09:07:00+08:00",
    ],
    [
        "劉思妤",
        "siyu.liu@nycu.edu.tw",
        "STUDENT",
        2,
        "2026-07-04T10:15:00+08:00",
    ],
    [
        "蔡宗翰",
        "zonghan.tsai@nycu.edu.tw",
        "STUDENT",
        1,
        "2026-07-05T15:30:00+08:00",
    ],
    [
        "楊舒涵",
        "shuhan.yang@nycu.edu.tw",
        "STUDENT",
        3,
        "2026-07-06T08:55:00+08:00",
    ],
    ["周奕辰", "yichen.chou@nycu.edu.tw", "STUDENT", 0, null],
    [
        "鄭育誠",
        "yucheng.cheng@nycu.edu.tw",
        "STUDENT",
        2,
        "2026-07-06T10:40:00+08:00",
    ],
    [
        "佘曉青",
        "professor.wang@nycu.edu.tw",
        "EXPERIMENTER",
        4,
        "2026-07-01T08:30:00+08:00",
    ],
] as const satisfies readonly (readonly [
    string,
    string,
    UserRole,
    number,
    string | null,
])[];

export const demoParticipants: ParticipantProgress[] = people.map(
    ([name, email, role, completedMaterials, startedAt], index) => ({
        userId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        name,
        email,
        role,
        completedMaterials,
        totalMaterials: 4,
        startedAt,
    })
);

export const demoMaterials: MaterialProgress[] = [
    {
        materialId: "10000000-0000-4000-8000-000000000001",
        code: "GEN-01",
        name: "豌豆－種皮形狀單因子遺傳與表型觀察",
        description: "單因子遺傳與表型觀察",
        completedStudents: 0,
        totalStudents: 32,
    },
    {
        materialId: "10000000-0000-4000-8000-000000000002",
        code: "GEN-02",
        name: "豌豆－莖高",
        description: "顯性與隱性性狀分析",
        completedStudents: 16,
        totalStudents: 32,
    },
    {
        materialId: "10000000-0000-4000-8000-000000000003",
        code: "GEN-03",
        name: "果蠅－眼色",
        description: "伴性遺傳推理活動",
        completedStudents: 32,
        totalStudents: 32,
    },
    {
        materialId: "10000000-0000-4000-8000-000000000004",
        code: "GEN-04",
        name: "金魚草－花色",
        description: "不完全顯性遺傳",
        completedStudents: 32,
        totalStudents: 32,
    },
];

export const demoCandidates: ParticipantCandidate[] = [
    ["謝小明", "example@gmail.com", "AVAILABLE"],
    ["陳佳穎", "jiaying.chen@gmail.com", "AVAILABLE"],
    ["林品妍", "pinyan.lin@gmail.com", "CONFLICT"],
    ["吳宇翔", "yuxiang.wu@gmail.com", "AVAILABLE"],
    ["李小華", "sample123@yahoo.com", "CONFLICT"],
    ["王大明", "test456@hotmail.com", "CONFLICT"],
    ["張李小美", "example123@gmail.com", "CONFLICT"],
    ["張偉", "info789@yahoo.com", "CONFLICT"],
].map(([name, email, availability], index) => ({
    userId: `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    name,
    email,
    availability: availability as ParticipantCandidate["availability"],
    ...(availability === "CONFLICT"
        ? { conflictReason: "時間重疊其他實驗" }
        : {}),
}));
