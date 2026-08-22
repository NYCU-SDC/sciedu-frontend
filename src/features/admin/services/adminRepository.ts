import { api } from "../../../shared/utils/api";
import {
    demoCandidateUsers,
    demoCourses,
    demoCurrentUser,
    demoExperiment,
    demoParticipants,
} from "../data/demoAdminData";
import type {
    Experiment,
    ExperimentCourseAssignment,
    ExperimentDetail,
    ExperimentListParams,
    ExperimentParticipantAssignment,
    PaginatedResponse,
    ParticipantCandidate,
    User,
    UserListParams,
} from "../types";

export const isAdminDemoMode =
    import.meta.env.DEV && import.meta.env.VITE_ADMIN_DEMO_MODE === "true";

const DEMO_DELAY_MS = 180;
const MAX_PAGE_SIZE = 100;

let demoParticipantState = [...demoParticipants];

const resolveDemo = <T>(value: T): Promise<T> =>
    new Promise((resolve) =>
        window.setTimeout(() => resolve(value), DEMO_DELAY_MS)
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
        const matches =
            (!params.status || demoExperiment.status === params.status) &&
            (!query ||
                demoExperiment.name
                    .toLocaleLowerCase("zh-Hant")
                    .includes(query));
        return resolveDemo(
            paginate(
                matches ? [demoExperiment] : [],
                params.page ?? 1,
                params.pageSize ?? 20
            )
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

export function fetchExperiment(
    experimentId: string
): Promise<ExperimentDetail> {
    if (isAdminDemoMode) {
        return resolveDemo({
            ...demoExperiment,
            participantCount: demoParticipantState.length,
            courseCount: demoCourses.length,
        });
    }
    return api<ExperimentDetail>(`/api/experiments/${experimentId}`);
}

async function fetchParticipantPage(
    experimentId: string,
    page: number
): Promise<PaginatedResponse<ExperimentParticipantAssignment>> {
    if (isAdminDemoMode) {
        return resolveDemo(paginate(demoParticipantState, page, MAX_PAGE_SIZE));
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
        return resolveDemo(paginate(demoCourses, page, MAX_PAGE_SIZE));
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

async function fetchUserPage(
    params: UserListParams,
    page: number
): Promise<PaginatedResponse<User>> {
    if (isAdminDemoMode) {
        const query = params.search?.trim().toLocaleLowerCase("zh-Hant") ?? "";
        const users = demoCandidateUsers.filter(
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

    const assignedIds = new Set(
        demoParticipantState.map((assignment) => assignment.participant.id)
    );
    const assignedAt = new Date().toISOString();
    const additions = demoCandidateUsers
        .filter(
            (user) => userIds.includes(user.id) && !assignedIds.has(user.id)
        )
        .map((participant) => ({ participant, assignedAt }));
    demoParticipantState = [...demoParticipantState, ...additions];
    return resolveDemo(additions);
}
