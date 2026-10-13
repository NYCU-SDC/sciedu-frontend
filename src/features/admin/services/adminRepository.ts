import { api, ApiError } from "../../../shared/utils/api";
import {
    demoCandidateUsers,
    demoCourses,
    demoCurrentUser,
    demoExperiment,
    demoParticipants,
} from "../data/demoAdminData";
import type {
    Course,
    EditableExperimentPayload,
    Experiment,
    ExperimentCourseAssignment,
    ExperimentDetail,
    ExperimentListParams,
    ExperimentParticipantAssignment,
    PaginatedResponse,
    ParticipantCandidate,
    User,
    UserListParams,
    ExperimentStatus,
} from "../types";

export const isAdminDemoMode =
    import.meta.env.DEV && import.meta.env.VITE_ADMIN_DEMO_MODE === "true";

const DEMO_DELAY_MS = 180;
const MAX_PAGE_SIZE = 100;
const demoUsers = [
    ...demoParticipants.map(({ participant }) => participant),
    ...demoCandidateUsers,
];

type DemoState = {
    experiment: ExperimentDetail;
    participants: ExperimentParticipantAssignment[];
    courses: ExperimentCourseAssignment[];
};
const demoState = new Map<string, DemoState>([
    [
        demoExperiment.id,
        structuredClone({
            experiment: demoExperiment,
            participants: demoParticipants,
            courses: demoCourses,
        }),
    ],
]);

function getDemoState(id: string) {
    const state = demoState.get(id);
    if (!state) throw new ApiError("找不到實驗", 404);
    return state;
}

function demoDetail(state: DemoState): ExperimentDetail {
    return {
        ...state.experiment,
        participantCount: state.participants.length,
        courseCount: state.courses.length,
    };
}

const resolveDemo = <T>(value: T): Promise<T> =>
    new Promise((resolve) =>
        window.setTimeout(() => resolve(structuredClone(value)), DEMO_DELAY_MS)
    );

function toSearchParams(values: Record<string, string | number | undefined>) {
    const params = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
            params.set(key, String(value));
        }
    });
    return params;
}

function paginate<T>(
    items: T[],
    page: number,
    pageSize: number
): PaginatedResponse<T> {
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const offset = (currentPage - 1) * pageSize;
    return {
        items: items.slice(offset, offset + pageSize),
        totalPages,
        totalItems: items.length,
        currentPage,
        pageSize,
        hasNextPage: currentPage < totalPages,
    };
}

async function collectAllPages<T>(
    fetchPage: (page: number) => Promise<PaginatedResponse<T>>
): Promise<T[]> {
    const firstPage = await fetchPage(1);
    const items = [...firstPage.items];
    for (let page = 2; page <= firstPage.totalPages; page += 1) {
        const response = await fetchPage(page);
        items.push(...response.items);
    }
    return items;
}

export function fetchCurrentUser(): Promise<User> {
    if (isAdminDemoMode) return resolveDemo(demoCurrentUser);
    return api<User>("/api/users/me");
}

export function listExperiments(
    params: ExperimentListParams = {}
): Promise<PaginatedResponse<Experiment>> {
    if (isAdminDemoMode) {
        const query = params.search?.trim().toLocaleLowerCase("zh-Hant") ?? "";
        const matches = [...demoState.values()]
            .map(demoDetail)
            .filter(
                (experiment) =>
                    (!params.status || experiment.status === params.status) &&
                    (!query ||
                        experiment.name
                            .toLocaleLowerCase("zh-Hant")
                            .includes(query)) &&
                    (!params.scheduledFrom ||
                        Date.parse(experiment.scheduledStartAt) >=
                            Date.parse(params.scheduledFrom)) &&
                    (!params.scheduledTo ||
                        Date.parse(experiment.scheduledStartAt) <=
                            Date.parse(params.scheduledTo))
            );
        return resolveDemo(
            paginate(matches, params.page ?? 1, params.pageSize ?? 20)
        );
    }

    const query = toSearchParams({
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
        status: params.status,
        scheduledFrom: params.scheduledFrom,
        scheduledTo: params.scheduledTo,
        search: params.search?.trim() || undefined,
    });
    return api<PaginatedResponse<Experiment>>(`/api/experiments?${query}`);
}

export function listAllExperiments(): Promise<Experiment[]> {
    return collectAllPages((page) =>
        listExperiments({ page, pageSize: MAX_PAGE_SIZE })
    );
}

export function fetchExperiment(
    experimentId: string
): Promise<ExperimentDetail> {
    if (isAdminDemoMode) {
        return resolveDemo(demoDetail(getDemoState(experimentId)));
    }
    return api<ExperimentDetail>(`/api/experiments/${experimentId}`);
}

export function createExperiment(
    payload: EditableExperimentPayload
): Promise<ExperimentDetail> {
    if (isAdminDemoMode) {
        const now = new Date().toISOString();
        const experiment: ExperimentDetail = {
            ...structuredClone(payload),
            id: crypto.randomUUID(),
            status: "DRAFT",
            createdBy: demoCurrentUser.id,
            createdAt: now,
            updatedAt: now,
            participantCount: 0,
            courseCount: 0,
        };
        demoState.set(experiment.id, {
            experiment,
            participants: [],
            courses: [],
        });
        return resolveDemo(experiment);
    }
    return api<ExperimentDetail>("/api/experiments", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function updateExperiment(
    experimentId: string,
    payload: EditableExperimentPayload
): Promise<ExperimentDetail> {
    if (isAdminDemoMode) {
        const state = getDemoState(experimentId);
        state.experiment = {
            ...state.experiment,
            ...structuredClone(payload),
            updatedAt: new Date().toISOString(),
        };
        return resolveDemo(demoDetail(state));
    }
    return api<ExperimentDetail>(`/api/experiments/${experimentId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
}

export function updateExperimentStatus(
    experimentId: string,
    status: ExperimentStatus
): Promise<ExperimentDetail> {
    if (isAdminDemoMode) {
        const state = getDemoState(experimentId);
        state.experiment = {
            ...state.experiment,
            status,
            updatedAt: new Date().toISOString(),
        };
        return resolveDemo(demoDetail(state));
    }
    return api<ExperimentDetail>(`/api/experiments/${experimentId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
    });
}

async function fetchParticipantPage(
    experimentId: string,
    page: number
): Promise<PaginatedResponse<ExperimentParticipantAssignment>> {
    if (isAdminDemoMode) {
        return resolveDemo(
            paginate(
                getDemoState(experimentId).participants,
                page,
                MAX_PAGE_SIZE
            )
        );
    }
    const query = toSearchParams({ page, pageSize: MAX_PAGE_SIZE });
    return api<PaginatedResponse<ExperimentParticipantAssignment>>(
        `/api/experiments/${experimentId}/participants?${query}`
    );
}

export function listExperimentParticipants(
    experimentId: string
): Promise<ExperimentParticipantAssignment[]> {
    return collectAllPages((page) => fetchParticipantPage(experimentId, page));
}

async function fetchCoursePage(
    experimentId: string,
    page: number
): Promise<PaginatedResponse<ExperimentCourseAssignment>> {
    if (isAdminDemoMode) {
        return resolveDemo(
            paginate(getDemoState(experimentId).courses, page, MAX_PAGE_SIZE)
        );
    }
    const query = toSearchParams({ page, pageSize: MAX_PAGE_SIZE });
    return api<PaginatedResponse<ExperimentCourseAssignment>>(
        `/api/experiments/${experimentId}/courses?${query}`
    );
}

export function listExperimentCourses(
    experimentId: string
): Promise<ExperimentCourseAssignment[]> {
    return collectAllPages((page) => fetchCoursePage(experimentId, page));
}

async function fetchCourseCandidatePage(
    page: number
): Promise<PaginatedResponse<Course>> {
    if (isAdminDemoMode) {
        return resolveDemo(
            paginate(
                demoCourses.map(({ course }) => course),
                page,
                MAX_PAGE_SIZE
            )
        );
    }
    const query = toSearchParams({
        page,
        pageSize: MAX_PAGE_SIZE,
        status: "PUBLISHED",
    });
    return api<PaginatedResponse<Course>>(`/api/courses?${query}`);
}

export function listExperimentCourseCandidates(): Promise<Course[]> {
    return collectAllPages(fetchCourseCandidatePage);
}

export function addExperimentCourses(
    experimentId: string,
    courseIds: string[]
): Promise<ExperimentCourseAssignment[]> {
    if (isAdminDemoMode) {
        const state = getDemoState(experimentId);
        const courseIdsSet = new Set(courseIds);
        const assignedIds = new Set(
            state.courses.map(({ course }) => course.id)
        );
        const additions = demoCourses
            .filter(
                ({ course }) =>
                    courseIdsSet.has(course.id) && !assignedIds.has(course.id)
            )
            .map(({ course }) => ({
                course,
                linkedAt: new Date().toISOString(),
            }));
        state.courses = [...state.courses, ...additions];
        return resolveDemo(additions);
    }
    return api<ExperimentCourseAssignment[]>(
        `/api/experiments/${experimentId}/courses`,
        {
            method: "POST",
            body: JSON.stringify({ courseIds }),
        }
    );
}

export async function removeExperimentCourse(
    experimentId: string,
    courseId: string
): Promise<void> {
    if (isAdminDemoMode) {
        const state = getDemoState(experimentId);
        state.courses = state.courses.filter(
            ({ course }) => course.id !== courseId
        );
        return resolveDemo(undefined);
    }
    await api<void>(`/api/experiments/${experimentId}/courses/${courseId}`, {
        method: "DELETE",
    });
}

async function fetchUserPage(
    params: UserListParams,
    page: number
): Promise<PaginatedResponse<User>> {
    if (isAdminDemoMode) {
        const query = params.search?.trim().toLocaleLowerCase("zh-Hant") ?? "";
        const users = demoUsers.filter(
            (user) =>
                (!params.role || user.roles.includes(params.role)) &&
                (!query ||
                    user.name.toLocaleLowerCase("zh-Hant").includes(query) ||
                    user.email.toLocaleLowerCase().includes(query))
        );
        return resolveDemo(paginate(users, page, MAX_PAGE_SIZE));
    }

    const query = toSearchParams({
        page,
        pageSize: MAX_PAGE_SIZE,
        search: params.search?.trim() || undefined,
        role: params.role,
    });
    return api<PaginatedResponse<User>>(`/api/users?${query}`);
}

export async function listParticipantCandidates(
    experimentId: string,
    search: string
): Promise<ParticipantCandidate[]> {
    const [users, participants] = await Promise.all([
        collectAllPages((page) =>
            fetchUserPage({ search, role: "STUDENT" }, page)
        ),
        listExperimentParticipants(experimentId),
    ]);
    const assignedIds = new Set(
        participants.map((assignment) => assignment.participant.id)
    );
    return users.map((user) => ({
        user,
        isAssigned: assignedIds.has(user.id),
    }));
}

export async function addExperimentParticipants(
    experimentId: string,
    userIds: string[]
): Promise<ExperimentParticipantAssignment[]> {
    if (!isAdminDemoMode) {
        return api<ExperimentParticipantAssignment[]>(
            `/api/experiments/${experimentId}/participants`,
            {
                method: "POST",
                body: JSON.stringify({ userIds }),
            }
        );
    }

    const state = getDemoState(experimentId);
    const assignedIds = new Set(
        state.participants.map((assignment) => assignment.participant.id)
    );
    const assignedAt = new Date().toISOString();
    const additions = demoUsers
        .filter(
            (user) => userIds.includes(user.id) && !assignedIds.has(user.id)
        )
        .map((participant) => ({ participant, assignedAt }));
    state.participants = [...state.participants, ...additions];
    return resolveDemo(additions);
}

export async function removeExperimentParticipant(
    experimentId: string,
    userId: string
): Promise<void> {
    if (!isAdminDemoMode) {
        await api<void>(
            `/api/experiments/${experimentId}/participants/${userId}`,
            { method: "DELETE" }
        );
        return;
    }

    const state = getDemoState(experimentId);
    state.participants = state.participants.filter(
        ({ participant }) => participant.id !== userId
    );
    await resolveDemo(undefined);
}
