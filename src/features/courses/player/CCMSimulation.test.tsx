// @vitest-environment jsdom
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import CCMSimulation from "./CCMSimulation";
afterEach(() => {
    cleanup();
    vi.useRealTimers();
});
it("restores only its own iframe, validates state, supports reset and expansion without remounting", () => {
    const onChange = vi.fn();
    render(
        <CCMSimulation
            id="ccm-marrow-v1"
            state={{ position: 2, speed: 0.75 }}
            onChange={onChange}
        />
    );
    const frame = screen.getByTitle("骨髓造血互動模擬") as HTMLIFrameElement;
    expect(frame.getAttribute("sandbox")).toBe("allow-scripts");
    const post = vi.spyOn(frame.contentWindow!, "postMessage");
    const message = (
        type: string,
        state?: unknown,
        source: MessageEventSource | null = frame.contentWindow,
        channel = "sciedu-ccm-marrow-v1"
    ) =>
        fireEvent(
            window,
            new MessageEvent("message", {
                source,
                data: { channel, type, state },
            })
        );
    message("ready", undefined, window);
    expect(post).not.toHaveBeenCalled();
    message("ready");
    expect(post).toHaveBeenCalledWith(
        {
            channel: "sciedu-ccm-marrow-v1",
            type: "restore",
            state: { position: 2, speed: 0.75 },
        },
        "*"
    );
    message("state", { position: 20, speed: 1 });
    expect(onChange).not.toHaveBeenCalled();
    message("state", { position: 3, speed: 1, secret: "discard" });
    expect(onChange).toHaveBeenCalledWith({ position: 3, speed: 1 });
    fireEvent.click(screen.getByText("重設模擬"));
    expect(post).toHaveBeenLastCalledWith(
        { channel: "sciedu-ccm-marrow-v1", type: "reset" },
        "*"
    );
    fireEvent.click(screen.getByRole("button", { name: "放大模擬" }));
    expect(screen.getByTitle("骨髓造血互動模擬")).toBe(frame);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("button", { name: "放大模擬" })).toBeTruthy();
});
it("shows media-specific errors and allows a fresh iframe retry", () => {
    vi.useFakeTimers();
    render(<CCMSimulation id="ccm-heart-v1" />);
    const frame = screen.getByTitle("心臟如何推送血液");
    act(() => vi.advanceTimersByTime(15001));
    expect(screen.getByRole("alert").textContent).toContain("影片或模擬圖片");
    expect(screen.getByRole("alert").textContent).not.toContain("WebGL");
    fireEvent.click(screen.getByText("重新載入模擬"));
    expect(screen.getByTitle("心臟如何推送血液")).not.toBe(frame);
});
