// @vitest-environment jsdom
import { afterAll, expect, it } from "vitest";
import { matchRoutes } from "react-router";
import { router } from "./routes";

afterAll(() => router.dispose());

it("passes the public course URL's UUID as the CoursePlayer courseId", () => {
    const courseId = "10000000-0000-4000-8000-000000000001";
    const matches = matchRoutes(router.routes, `/course/${courseId}`);
    expect(matches?.at(-1)?.params).toEqual({ courseId });
});
