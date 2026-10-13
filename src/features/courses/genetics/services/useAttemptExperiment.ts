import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../../shared/auth";
import { api, ApiError } from "../../../../shared/utils/api";

type CurrentExperiment = {
    experiment: { id: string; status: string };
    courses: { id: string; status: string }[];
};
export function useAttemptExperiment() {
    const { session } = useAuth();
    return useQuery({
        queryKey: ["student", "current-experiment", session?.email],
        queryFn: () => api<CurrentExperiment>("/api/experiments/current"),
        enabled: Boolean(session?.email),
        retry: (count, error) =>
            !(
                error instanceof ApiError &&
                [401, 403, 404].includes(error.status)
            ) && count < 1,
    });
}
