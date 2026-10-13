// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import GeneticsCourse from "./GeneticsCourse";
const mocks = vi.hoisted(() => ({
    player: vi.fn(() => null),
    query: vi.fn(() => ({})),
}));
vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.query }));
vi.mock("../player/CoursePlayer", () => ({
    default: mocks.player,
    CourseStatus: ({ message }: { message: string }) => <p>{message}</p>,
}));
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});
describe("course review entry", () => {
    it("does not unlock a course from a URL review flag alone", () => {
        render(
            <MemoryRouter
                initialEntries={[
                    "/course/10000000-0000-4000-8000-000000000001?mode=review",
                ]}
            >
                <Routes>
                    <Route
                        path="/course/:courseId"
                        element={<GeneticsCourse />}
                    />
                </Routes>
            </MemoryRouter>
        );
        expect(
            screen.getByText("此入口尚未提供作答紀錄檢視，請返回書櫃")
        ).toBeTruthy();
        expect(mocks.player).not.toHaveBeenCalled();
        expect(mocks.query).toHaveBeenCalledWith(
            expect.objectContaining({ enabled: false })
        );
    });
});
