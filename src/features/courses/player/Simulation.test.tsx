// @vitest-environment jsdom
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import Simulation from "./Simulation";
import { DEFAULT_SIMULATION_STATE } from "./presentation";
afterEach(() => {
    cleanup();
    vi.useRealTimers();
});
it("isolates the iframe and restores only the validated experiment controls", () => {
    const onChange = vi.fn();
    render(
        <Simulation
            id="dark-room-v1"
            state={{ led: false, partition: true }}
            onChange={onChange}
        />
    );
    const frame = screen.getByTitle(
        "黑暗房間中的玩偶互動模擬"
    ) as HTMLIFrameElement;
    expect(frame.getAttribute("sandbox")).toBe("allow-scripts");
    const post = vi.spyOn(frame.contentWindow!, "postMessage");
    const message = (
        type: string,
        state?: unknown,
        source: MessageEventSource | null = frame.contentWindow
    ) =>
        fireEvent(
            window,
            new MessageEvent("message", {
                source,
                data: { channel: "sciedu-dark-room-v1", type, state },
            })
        );
    message("state", { led: false, partition: true }, window);
    expect(onChange).not.toHaveBeenCalled();
    message("ready");
    expect(post).toHaveBeenCalledWith(
        {
            channel: "sciedu-dark-room-v1",
            type: "set",
            state: { led: false, partition: true },
        },
        "*"
    );
    message("state", { led: "false", partition: true });
    expect(onChange).not.toHaveBeenCalled();
    message("state", { led: true, partition: true, extra: "not copied" });
    expect(onChange).toHaveBeenCalledWith({ led: true, partition: true });
    fireEvent.click(screen.getByText("重設 LED／隔板"));
    expect(post).toHaveBeenLastCalledWith(
        {
            channel: "sciedu-dark-room-v1",
            type: "set",
            state: DEFAULT_SIMULATION_STATE,
        },
        "*"
    );
});
it("shows a recoverable failure when the sandbox never becomes ready", () => {
    vi.useFakeTimers();
    render(<Simulation id="dark-room-v1" />);
    act(() => vi.advanceTimersByTime(15001));
    expect(screen.getByRole("alert").textContent).toContain("模擬無法載入");
    fireEvent.click(screen.getByText("重新載入模擬"));
    expect(screen.getByRole("status").textContent).toContain("載入中");
});
