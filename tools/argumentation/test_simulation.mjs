import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { test } from "node:test";

// Exercise the deployed simulation's real pointer handlers without a WebGL renderer.
const source = readFileSync(
    new URL(
        "../../public/simulations/dark-room/v1/assets/lab.js",
        import.meta.url
    ),
    "utf8"
);
const bindCamera = source.slice(
    source.indexOf("function bindCamera()"),
    source.indexOf("function layoutLabels()")
);
function camera() {
    const listeners = new Map();
    const orbit = { theta: 0, phi: 0.8, r: 10 };
    const canvas = {
        setPointerCapture() {},
        addEventListener(type, callback) {
            listeners.set(type, callback);
        },
    };
    vm.runInNewContext(bindCamera + ";bindCamera();", {
        renderer: { domElement: canvas },
        orbit,
        updateCamera() {},
    });
    return {
        orbit,
        pointer(type, x, y, id = 1) {
            listeners.get(type)({ pointerId: id, clientX: x, clientY: y });
        },
        wheel(deltaY) {
            listeners.get("wheel")({ deltaY, preventDefault() {} });
        },
    };
}
test("vertical orbit follows the same drag direction convention as horizontal orbit", () => {
    const c = camera();
    c.pointer("pointerdown", 100, 100);
    c.pointer("pointermove", 100, 80);
    assert.ok(c.orbit.phi > 0.8, "dragging upward must increase polar angle");
    assert.equal(c.orbit.theta, 0);
    c.pointer("pointermove", 100, 100);
    assert.ok(Math.abs(c.orbit.phi - 0.8) < 1e-10);
    c.pointer("pointermove", 120, 100);
    assert.equal(c.orbit.theta, -0.12, "horizontal drag remains unchanged");
    c.pointer("pointerup", 120, 100);
    c.pointer("pointermove", 200, 200);
    assert.equal(c.orbit.theta, -0.12);
});
test("camera keeps vertical limits, pinch and wheel zoom, and cancellation", () => {
    const c = camera();
    c.pointer("pointerdown", 0, 0);
    c.pointer("pointermove", 0, -10000);
    assert.equal(c.orbit.phi, Math.PI * 0.485);
    c.pointer("pointermove", 0, 10000);
    assert.equal(c.orbit.phi, 0.08);
    c.pointer("pointercancel", 0, 10000);
    c.pointer("pointermove", 0, 0);
    assert.equal(c.orbit.phi, 0.08);
    c.pointer("pointerdown", 0, 0);
    c.pointer("pointerdown", 100, 0, 2);
    c.pointer("pointermove", 200, 0, 2);
    assert.equal(c.orbit.r, 5);
    c.wheel(100000);
    assert.equal(c.orbit.r, 34);
    c.wheel(-100000);
    assert.equal(c.orbit.r, 4);
});
