// @vitest-environment jsdom
import { fireEvent, render, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import Composer from "./Composer";
afterEach(cleanup);
it("IME Enter including keyCode 229 never sends prematurely", () => {
    const submit = vi.fn();
    const view = render(
        <Composer value="中文問題" onChange={() => {}} onSubmit={submit} />
    );
    const input = view.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    fireEvent.keyDown(input, { key: "Enter", keyCode: 229 });
    expect(submit).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(submit).toHaveBeenCalledExactlyOnceWith("中文問題");
});
it("Shift Enter and busy state do not send; stop is an explicit action", () => {
    const submit = vi.fn(),
        stop = vi.fn();
    const view = render(
        <Composer
            value="問題"
            onChange={() => {}}
            onSubmit={submit}
            busy
            onStop={stop}
        />
    );
    fireEvent.keyDown(view.getByRole("textbox"), {
        key: "Enter",
        shiftKey: true,
    });
    fireEvent.keyDown(view.getByRole("textbox"), { key: "Enter" });
    expect(submit).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole("button", { name: "停止接收" }));
    expect(stop).toHaveBeenCalledTimes(1);
});
