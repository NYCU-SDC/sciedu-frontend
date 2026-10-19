/* SciEdu adapter: only the two experiment controls cross the sandbox boundary. */
(() => {
    const channel = "sciedu-dark-room-v1";
    const parentOrigin = document.referrer
        ? new URL(document.referrer).origin
        : null;
    const send = (type, extra = {}) => {
        if (parentOrigin)
            parent.postMessage({ channel, type, ...extra }, parentOrigin);
    };
    const valid = (s) =>
        s && typeof s.led === "boolean" && typeof s.partition === "boolean";
    const report = () => {
        if (window.__labError || !window.__labReady) send("error");
        else {
            const { led, partition } = window.__lab.state;
            send("state", { state: { led, partition } });
        }
    };
    addEventListener("message", (event) => {
        if (
            event.source !== parent ||
            event.origin !== parentOrigin ||
            event.data?.channel !== channel
        )
            return;
        if (event.data.type === "hello") {
            send(window.__labReady && !window.__labError ? "ready" : "error");
        } else if (
            event.data.type === "set" &&
            valid(event.data.state) &&
            window.__labReady
        ) {
            const { led, partition } = event.data.state;
            window.__lab.set({ led, partition });
            report();
        }
    });
    document.getElementById("controls").addEventListener("input", report);
    document
        .getElementById("viewport")
        .addEventListener("webglcontextlost", () => send("error"), true);
    send(window.__labReady && !window.__labError ? "ready" : "error");
})();
