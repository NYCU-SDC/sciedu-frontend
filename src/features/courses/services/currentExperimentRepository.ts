import { ApiError, api } from "../../../shared/utils/api";
import type { CurrentExperimentResponse } from "../types";

export async function getCurrentExperiment(): Promise<CurrentExperimentResponse | null> {
    try {
        const response = await api<CurrentExperimentResponse>(
            "/api/experiments/current"
        );

        return {
            experiment: response.experiment,
            courses: response.courses.filter(
                (course) => course.status === "PUBLISHED"
            ),
        };
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            return null;
        }
        throw error;
    }
}
