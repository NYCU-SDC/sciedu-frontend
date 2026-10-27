import { isWithinSchedule } from "../../experience/experimentExperience";
import { useExperimentClock } from "../../experience/useExperimentClock";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../shared/auth";
import { ApiError } from "../../../shared/utils/api";
import { getCurrentExperiment } from "./currentExperimentRepository";

export const currentExperimentKeys = {
    current: (userEmail: string) =>
        ["student", "current-experiment", userEmail] as const,
};
export function currentExperimentQueryOptions(userEmail: string) {
    return queryOptions({
        queryKey: currentExperimentKeys.current(userEmail),
        queryFn: getCurrentExperiment,
        enabled: Boolean(userEmail),
        retry: (count, error) =>
            !(
                error instanceof ApiError &&
                [401, 403, 404].includes(error.status)
            ) && count < 1,
    });
}
export function useCurrentExperimentQuery() {
    const { session } = useAuth();
    return useQuery(currentExperimentQueryOptions(session?.email ?? ""));
}
export function useCurrentExperimentCourses() {
    const query = useCurrentExperimentQuery();
    const current = query.data;
    const now = useExperimentClock(current ? [current.experiment] : []);
    const active = current && isWithinSchedule(current.experiment, now);
    return {
        experiment: active ? current.experiment : null,
        courses: active ? current.courses : [],
        error: query.error,
        isPending: query.isPending,
        refetch: query.refetch,
    };
}
