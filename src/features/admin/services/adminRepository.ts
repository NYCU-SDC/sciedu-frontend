import {
    demoCandidates,
    demoMaterials,
    demoOverview,
    demoParticipants,
} from "../data/demoAdminData";
import type {
    AdminOverview,
    MaterialListParams,
    MaterialProgress,
    PaginatedResponse,
    ParticipantCandidate,
    ParticipantListParams,
    ParticipantProgress,
} from "../types";

// sciedu-api does not define Experiment/Admin operations yet. Keeping the
// repository boundary explicit lets the UI switch to api<T>(...) once those
// TypeSpec contracts exist, without leaking demo behavior into components.
const resolveDemo = <T>(value: T): Promise<T> =>
    new Promise((resolve) => window.setTimeout(() => resolve(value), 180));

export function fetchAdminOverview(
    __experimentId: string
): Promise<AdminOverview> {
    return resolveDemo(demoOverview);
}

export function listParticipantProgress(
    __experimentId: string,
    params: ParticipantListParams
): Promise<PaginatedResponse<ParticipantProgress>> {
    const query = params.q.trim().toLocaleLowerCase("zh-Hant");
    const filtered = demoParticipants.filter((participant) => {
        const matchesQuery =
            !query ||
            participant.name.toLocaleLowerCase("zh-Hant").includes(query) ||
            participant.email.toLocaleLowerCase().includes(query);
        return (
            matchesQuery && (!params.role || participant.role === params.role)
        );
    });
    const offset = (params.page - 1) * params.pageSize;
    const totalPages = Math.max(
        1,
        Math.ceil(filtered.length / params.pageSize)
    );

    return resolveDemo({
        items: filtered.slice(offset, offset + params.pageSize),
        totalPages,
        totalItems: filtered.length,
        currentPage: Math.min(params.page, totalPages),
        pageSize: params.pageSize,
        hasNextPage: params.page < totalPages,
    });
}

export function listMaterialProgress(
    __experimentId: string,
    params: MaterialListParams
): Promise<PaginatedResponse<MaterialProgress>> {
    const query = params.q.trim().toLocaleLowerCase("zh-Hant");
    const filtered = demoMaterials
        .filter(
            (material) =>
                !query ||
                material.name.toLocaleLowerCase("zh-Hant").includes(query) ||
                material.code.toLocaleLowerCase().includes(query)
        )
        .sort((a, b) => {
            const aRate = a.completedStudents / a.totalStudents;
            const bRate = b.completedStudents / b.totalStudents;
            return params.order === "asc" ? aRate - bRate : bRate - aRate;
        });

    return resolveDemo({
        items: filtered,
        totalPages: 1,
        totalItems: filtered.length,
        currentPage: 1,
        pageSize: Math.max(filtered.length, 1),
        hasNextPage: false,
    });
}

export function listParticipantCandidates(
    __experimentId: string,
    q: string
): Promise<ParticipantCandidate[]> {
    const query = q.trim().toLocaleLowerCase("zh-Hant");
    return resolveDemo(
        demoCandidates.filter(
            (candidate) =>
                !query ||
                candidate.name.toLocaleLowerCase("zh-Hant").includes(query) ||
                candidate.email.toLocaleLowerCase().includes(query)
        )
    );
}

export function addExperimentParticipants(
    __experimentId: string,
    __userIds: string[]
): Promise<void> {
    return resolveDemo(undefined);
}
