// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import CourseChatSettings from "./CourseChatSettings";
import {
    availableChatPresets,
    courseChatConfiguration,
    saveCourseChatConfiguration,
} from "../../../shared/network/learning";
vi.mock("../../../shared/network/learning", () => ({
    availableChatPresets: vi.fn(),
    courseChatConfiguration: vi.fn(),
    saveCourseChatConfiguration: vi.fn(),
}));
let client: QueryClient;
beforeEach(() => {
    vi.clearAllMocks();
    client = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    vi.mocked(availableChatPresets).mockResolvedValue([
        { name: "augmentation_teacher_and_peer", description: "老師與同儕" },
    ]);
    vi.mocked(courseChatConfiguration).mockResolvedValue({
        configuration: null,
    });
});
afterEach(() => {
    cleanup();
    client.clear();
});
function show() {
    return render(
        <QueryClientProvider client={client}>
            <CourseChatSettings
                experimentId="experiment"
                courseId="course"
                courseCode="scientific-argumentation-dark-room"
            />
        </QueryClientProvider>
    );
}
it("suggests scientific preset but only saves on explicit admin action", async () => {
    vi.mocked(saveCourseChatConfiguration).mockResolvedValue({
        preset: "augmentation_teacher_and_peer",
        workflow: "argumentation-v1",
        locked: false,
    });
    show();
    await screen.findByLabelText("教材對話 preset");
    expect(
        (screen.getByLabelText("教材對話 preset") as HTMLSelectElement).value
    ).toBe("augmentation_teacher_and_peer");
    expect(saveCourseChatConfiguration).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("儲存教材對話設定"));
    await waitFor(() =>
        expect(saveCourseChatConfiguration).toHaveBeenCalledWith(
            "experiment",
            "course",
            {
                preset: "augmentation_teacher_and_peer",
                workflow: "argumentation-v1",
            }
        )
    );
});
it("locked existing chat configuration cannot be edited", async () => {
    vi.mocked(courseChatConfiguration).mockResolvedValue({
        configuration: {
            preset: "augmentation_teacher_and_peer",
            workflow: "argumentation-v1",
            locked: true,
        },
    });
    show();
    await screen.findByText(/已有教材聊天室/);
    expect(
        (screen.getByLabelText("教材對話 preset") as HTMLSelectElement)
            .disabled ||
            screen.getByLabelText("教材對話 preset").closest("fieldset")
                ?.disabled
    ).toBe(true);
    fireEvent.click(screen.getByText("儲存教材對話設定"));
    expect(saveCourseChatConfiguration).not.toHaveBeenCalled();
});
it("unavailable preset remains visible and never silently changes", async () => {
    vi.mocked(courseChatConfiguration).mockResolvedValue({
        configuration: {
            preset: "removed",
            workflow: "argumentation-v1",
            locked: false,
        },
    });
    show();
    await screen.findByText("指定 preset 目前不可用，不會改用其他角色。");
    expect(
        (screen.getByLabelText("教材對話 preset") as HTMLSelectElement).value
    ).toBe("removed");
    expect(
        (screen.getByText("儲存教材對話設定") as HTMLButtonElement).disabled
    ).toBe(true);
});
