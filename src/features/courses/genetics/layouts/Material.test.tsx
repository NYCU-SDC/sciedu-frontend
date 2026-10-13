// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { MaterialImageGallery } from "./Material";

beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
});

describe("MaterialImageGallery", () => {
    it("renders every image in a multi-image material page", () => {
        render(
            <MantineProvider>
                <MaterialImageGallery imageIds={["image-a", "image-b"]} />
            </MantineProvider>
        );

        expect(screen.getByAltText("教材圖片 1").getAttribute("src")).toContain(
            "/api/content/media/image-a"
        );
        expect(screen.getByAltText("教材圖片 2").getAttribute("src")).toContain(
            "/api/content/media/image-b"
        );
        expect(
            screen.getAllByRole("button", { name: /放大教材圖片/ })
        ).toHaveLength(2);
    });
});
