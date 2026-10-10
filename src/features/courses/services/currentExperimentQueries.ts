import { useQuery } from "@tanstack/react-query";

import { ApiError } from "../../../shared/utils/api";
import { getCurrentExperiment } from "./currentExperimentRepository";

export const currentExperimentKeys = {
    current: ["student", "current-experiment"] as const,
};

function retryCurrentExperimentQuery(count: number, error: Error) {
    if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
        return false;
    }
    return count < 1;
}

export function useCurrentExperimentCourses() {
    const currentExperimentQuery = useQuery({
        queryKey: currentExperimentKeys.current,
        queryFn: getCurrentExperiment,
        retry: retryCurrentExperimentQuery,
    });
    const current = currentExperimentQuery.data;

    return {
        experiment: current?.experiment ?? null,
        courses: current?.experiment.status === "ACTIVE" ? current.courses : [],
        error: currentExperimentQuery.error,
        isPending: currentExperimentQuery.isPending,
        refetch: currentExperimentQuery.refetch,
    };
}
