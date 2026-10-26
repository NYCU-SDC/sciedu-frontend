import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import { uploadMaterial } from "./uploader.mjs";
const payload = JSON.parse(
    readFileSync(new URL("./build/payload.json", import.meta.url))
);
const clone = (x) => structuredClone(x);
const account = "a0000000-0000-4000-8000-000000000001";
function harness() {
    const db = new Map(),
        store = new Map(),
        calls = [];
    let count = 0,
        locked = false;
    const id = () =>
        `b0000000-0000-4000-8000-${String(++count).padStart(12, "0")}`;
    const reply = (body, status = 200) =>
        new Response(JSON.stringify(body), {
            status,
            headers: { "Content-Type": "application/json" },
        });
    const h = {
        db,
        store,
        calls,
        before: null,
        after: null,
        actor: {
            id: account,
            email: payload.config.email,
            roles: ["ADMIN", "STUDENT"],
        },
        get count() {
            return count;
        },
    };
    const storage = {
        getItem: (k) => store.get(k) ?? null,
        setItem: (k, v) => store.set(k, v),
    };
    h.env = {
        storage,
        origin: payload.config.frontend,
        crypto: webcrypto,
        decodeBase64: (s) => new Uint8Array(Buffer.from(s, "base64")),
        locks: {
            async request(k, o, fn) {
                if (locked) return fn(null);
                locked = true;
                try {
                    return await fn({});
                } finally {
                    locked = false;
                }
            },
        },
        async fetch(url, options = {}) {
            assert.equal(new URL(url).origin, payload.config.backend);
            assert.equal(options.credentials, "include");
            assert.equal(options.redirect, "error");
            const u = new URL(url),
                path = u.pathname,
                method = options.method ?? "GET";
            const call = { path, method };
            calls.push(call);
            if (h.before) {
                const r = await h.before(call);
                if (r) return r;
            }
            let result;
            if (path === "/api/auth/session")
                result = reply({ authenticated: true });
            else if (path === "/api/users/me") result = reply(h.actor);
            else if (method === "GET" && path === "/api/courses") {
                const items = [...db.values()].filter(
                    (v) =>
                        v.kind === "course" &&
                        (!u.searchParams.has("status") ||
                            v.status === u.searchParams.get("status"))
                );
                result = reply({
                    items,
                    currentPage: 1,
                    totalItems: items.length,
                    hasNextPage: false,
                    totalPages: items.length ? 1 : 0,
                });
            } else if (
                method === "GET" &&
                /^\/api\/courses\/[^/]+\/pages$/.test(path)
            ) {
                result = reply(
                    [...db.values()].filter(
                        (v) =>
                            v.kind === "page" &&
                            v.courseId === path.split("/")[3]
                    )
                );
            } else if (
                method === "GET" &&
                /^\/api\/pages\/[^/]+\/blocks$/.test(path)
            ) {
                result = reply(
                    [...db.values()].filter(
                        (v) =>
                            v.kind === "block" &&
                            v.pageId === path.split("/")[3]
                    )
                );
            } else if (method === "GET") {
                const item = db.get(path.split("/").at(-1));
                result = !item
                    ? reply({}, 404)
                    : item.kind === "media"
                      ? new Response(item.bytes)
                      : reply(item);
            } else if (method === "POST") {
                const latest = JSON.parse([...store.values()][0]);
                assert.ok(
                    Object.values(latest.items).some(
                        (x) => x.path === path && x.status === "pending"
                    ),
                    "pending durable before create"
                );
                const rid = id();
                let item;
                if (path === "/api/content/media")
                    item = {
                        id: rid,
                        kind: "media",
                        bytes: new Uint8Array(
                            await options.body.get("content").arrayBuffer()
                        ),
                    };
                else {
                    const body = JSON.parse(options.body);
                    if (path === "/api/courses")
                        item = {
                            ...body,
                            id: rid,
                            kind: "course",
                            status: "DRAFT",
                        };
                    else if (/^\/api\/courses\/[^/]+\/pages$/.test(path))
                        item = {
                            ...body,
                            id: rid,
                            kind: "page",
                            courseId: path.split("/")[3],
                        };
                    else if (/^\/api\/pages\/[^/]+\/blocks$/.test(path))
                        item = {
                            ...body,
                            id: rid,
                            kind: "block",
                            pageId: path.split("/")[3],
                        };
                    else if (path === "/api/content/text")
                        item = {
                            ...body,
                            content: body.content.trim(),
                            id: rid,
                            kind: "text",
                            type: "TEXT",
                        };
                    else if (path === "/api/questions")
                        item = { ...body, id: rid, kind: "question" };
                    else throw Error("unexpected POST " + path);
                }
                db.set(rid, item);
                result = reply(item, 201);
            } else if (
                method === "PUT" &&
                /^\/api\/courses\/[^/]+\/status$/.test(path)
            ) {
                const latest = JSON.parse([...store.values()][0]);
                assert.equal(latest.complete, true);
                const course = db.get(path.split("/")[3]);
                course.status = JSON.parse(options.body).status;
                result = reply(course);
            } else throw Error("Unexpected API " + method + " " + path);
            if (h.after) await h.after(call);
            return result;
        },
    };
    h.run = (p = payload) => uploadMaterial(p, h.env);
    return h;
}
test("complete upload publishes 100 resources; rerun creates nothing", async () => {
    const h = harness(),
        r = await h.run();
    assert.equal(r.status, "PUBLISHED", r.error);
    assert.equal(h.count, 100);
    assert.equal(r.counts.questions, 12);
    assert.equal(r.counts.media, 1);
    assert.deepEqual(
        r.pages.map((p) => p.chatEnabled),
        [false, false, true, false, false, true, false]
    );
    const mutations = h.calls.filter((x) => x.method !== "GET").length;
    const r2 = await h.run();
    assert.equal(r2.status, "PUBLISHED", r2.error);
    assert.equal(h.count, 100);
    assert.equal(h.calls.filter((x) => x.method !== "GET").length, mutations);
    assert.ok(!JSON.stringify(r).includes("access_token"));
});
test("lost checkpoint adopts fully identical published course read-only", async () => {
    const h = harness();
    assert.equal((await h.run()).status, "PUBLISHED");
    h.store.clear();
    h.calls.length = 0;
    const r = await h.run();
    assert.equal(r.status, "PUBLISHED", r.error);
    assert.equal(h.count, 100);
    assert.ok(h.calls.every((x) => x.method === "GET"));
});
test("identical external DRAFT is verified then published without creating", async () => {
    const h = harness();
    await h.run();
    h.store.clear();
    [...h.db.values()].find((x) => x.kind === "course").status = "DRAFT";
    h.calls.length = 0;
    const r = await h.run();
    assert.equal(r.status, "PUBLISHED", r.error);
    assert.equal(h.count, 100);
    assert.equal(h.calls.filter((x) => x.method === "PUT").length, 1);
    assert.ok(!h.calls.some((x) => x.method === "POST"));
});
test("external incomplete/different content stops without overwrite", async () => {
    const h = harness();
    await h.run();
    h.store.clear();
    [...h.db.values()].find((x) => x.kind === "text").content = "different";
    h.calls.length = 0;
    const r = await h.run();
    assert.equal(r.status, "STOPPED");
    assert.match(r.error, /content 不符/);
    assert.ok(h.calls.every((x) => x.method === "GET"));
});
for (const [name, match] of Object.entries({
    course: (p) => p === "/api/courses",
    page: (p) => p.endsWith("/pages"),
    text: (p) => p === "/api/content/text",
    media: (p) => p === "/api/content/media",
    question: (p) => p === "/api/questions",
    block: (p) => p.endsWith("/blocks"),
})) {
    test(`committed ${name} with lost response is never blindly retried`, async () => {
        const h = harness();
        let hit = false;
        h.after = (call) => {
            if (!hit && call.method === "POST" && match(call.path)) {
                hit = true;
                throw Error("lost");
            }
        };
        const first = await h.run();
        assert.equal(first.status, "STOPPED");
        assert.ok(hit);
        const count = h.count;
        h.after = null;
        h.calls.length = 0;
        const second = await h.run();
        assert.equal(second.status, "STOPPED");
        assert.equal(h.count, count);
        assert.ok(h.calls.every((x) => x.method === "GET"));
    });
}
test("GET fails after saved ID; fresh execution resumes without recreating it", async () => {
    const h = harness();
    let hit = false;
    h.before = (call) => {
        if (
            !hit &&
            call.method === "GET" &&
            call.path.startsWith("/api/content/text/")
        ) {
            hit = true;
            throw Error("offline");
        }
    };
    assert.equal((await h.run()).status, "STOPPED");
    h.before = null;
    const r = await h.run();
    assert.equal(r.status, "PUBLISHED", r.error);
    assert.equal(h.count, 100);
});
test("401 create rejection is safe to resume after re-login", async () => {
    const h = harness();
    let hit = false;
    h.before = (call) => {
        if (!hit && call.method === "POST" && call.path === "/api/questions") {
            hit = true;
            return new Response("{}", { status: 401 });
        }
    };
    assert.equal((await h.run()).status, "STOPPED");
    h.before = null;
    const r = await h.run();
    assert.equal(r.status, "PUBLISHED", r.error);
    assert.equal(h.count, 100);
});
for (const status of [400, 403, 409])
    test(`${status} create stops and blocks automatic retry`, async () => {
        const h = harness();
        h.before = (c) =>
            c.method === "POST" ? new Response("{}", { status }) : undefined;
        assert.equal((await h.run()).status, "STOPPED");
        h.before = null;
        const r = await h.run();
        assert.equal(r.status, "STOPPED");
        assert.equal(h.count, 0);
    });
test("publish response lost is confirmed with GET", async () => {
    const h = harness();
    h.after = (c) => {
        if (c.method === "PUT") throw Error("lost");
    };
    const r = await h.run();
    assert.equal(r.status, "PUBLISHED", r.error);
    assert.equal(h.calls.filter((x) => x.method === "PUT").length, 1);
});
test("publish and follow-up GET failure recover on rerun without another PUT", async () => {
    const h = harness();
    let offline = false;
    h.after = (c) => {
        if (c.method === "PUT") {
            offline = true;
            throw Error("lost");
        }
    };
    h.before = () => {
        if (offline) throw Error("offline");
    };
    assert.equal((await h.run()).status, "STOPPED");
    offline = false;
    h.before = null;
    h.after = null;
    const r = await h.run();
    assert.equal(r.status, "PUBLISHED", r.error);
    assert.equal(h.calls.filter((x) => x.method === "PUT").length, 1);
});
test("different origin/account/role and corrupt image fail before creates", async () => {
    for (const mode of ["origin", "email", "role", "image"]) {
        const h = harness(),
            p = clone(payload);
        if (mode === "origin") h.env.origin = "http://localhost:3000";
        if (mode === "email") h.actor.email = "other@example.com";
        if (mode === "role") h.actor.roles = ["STUDENT"];
        if (mode === "image") p.assets["assets/heart-preview.png"] = "YQ==";
        assert.equal((await h.run(p)).status, "STOPPED", mode);
        assert.equal(h.count, 0);
    }
});
test("checkpoint binding mismatch, corrupt storage and quota failure stop all writes", async () => {
    const h = harness();
    await h.run();
    const key = [...h.store.keys()][0],
        original = h.store.get(key);
    for (const field of [
        "actorId",
        "backend",
        "fingerprint",
        "version",
        "commit",
    ]) {
        const state = JSON.parse(original);
        state.binding[field] = "wrong";
        h.store.set(key, JSON.stringify(state));
        h.calls.length = 0;
        assert.equal((await h.run()).status, "STOPPED");
        assert.ok(h.calls.every((x) => x.method === "GET"));
    }
    h.store.set(key, "broken");
    assert.equal((await h.run()).status, "STOPPED");
    const q = harness();
    q.env.storage.setItem = () => {
        throw Error("quota");
    };
    assert.equal((await q.run()).status, "STOPPED");
    assert.equal(q.count, 0);
});
test("concurrent execution fails closed via Web Lock", async () => {
    const h = harness();
    const [a, b] = await Promise.all([h.run(), h.run()]);
    assert.equal(a.status, "PUBLISHED", a.error);
    assert.equal(b.status, "STOPPED");
    assert.match(b.error, /另一分頁/);
    assert.equal(h.count, 100);
});
test("duplicate course and duplicate question linkage are rejected", async () => {
    const h = harness();
    await h.run();
    h.store.clear();
    const course = [...h.db.values()].find((x) => x.kind === "course");
    h.db.set("c0000000-0000-4000-8000-000000000001", {
        ...course,
        id: "c0000000-0000-4000-8000-000000000001",
    });
    h.calls.length = 0;
    assert.equal((await h.run()).status, "STOPPED");
    assert.ok(h.calls.every((x) => x.method === "GET"));
});
test("two answers must reference different question IDs", async () => {
    const h = harness();
    await h.run();
    h.store.clear();
    const questions = [...h.db.values()].filter(
        (x) => x.kind === "block" && x.type === "QUESTION"
    );
    questions[1].resourceId = questions[0].resourceId;
    h.calls.length = 0;
    const r = await h.run();
    assert.equal(r.status, "STOPPED");
    assert.match(r.error, /ID 重複/);
    assert.ok(h.calls.every((x) => x.method === "GET"));
});
test("changed page settings and missing pages stop before publishing", async () => {
    for (const mode of ["settings", "missing"]) {
        const h = harness();
        await h.run();
        h.store.clear();
        [...h.db.values()].find((x) => x.kind === "course").status = "DRAFT";
        if (mode === "missing") {
            const page = [...h.db.values()].find((x) => x.kind === "page");
            h.db.delete(page.id);
        } else {
            const b = [...h.db.values()].find(
                (x) => x.kind === "block" && x.displayOrder === 201
            );
            h.db.get(b.resourceId).content = "{}";
        }
        h.calls.length = 0;
        assert.equal((await h.run()).status, "STOPPED");
        assert.ok(h.calls.every((x) => x.method === "GET"));
    }
});
test("failed status PUT with verified DRAFT retries only on explicit rerun", async () => {
    const h = harness();
    let once = false;
    h.before = (c) => {
        if (!once && c.method === "PUT") {
            once = true;
            throw Error("offline before submit");
        }
    };
    assert.equal((await h.run()).status, "STOPPED");
    assert.equal(h.count, 100);
    assert.equal(h.calls.filter((x) => x.method === "PUT").length, 1);
    h.before = null;
    const r = await h.run();
    assert.equal(r.status, "PUBLISHED", r.error);
    assert.equal(h.count, 100);
    assert.equal(h.calls.filter((x) => x.method === "PUT").length, 2);
});
test("delivered self-contained Console bundle runs with only browser APIs", async () => {
    const { runInNewContext } = await import("node:vm");
    const h = harness(),
        nodes = [];
    const document = {
        createElement(tag) {
            const node = {
                tag,
                style: {},
                append() {},
                remove() {},
                click() {},
            };
            nodes.push(node);
            return node;
        },
        body: { append() {} },
    };
    const result = await runInNewContext(
        readFileSync(
            new URL("./build/UPLOAD-PASTE-IN-CONSOLE.js", import.meta.url),
            "utf8"
        ),
        {
            window: {
                fetch: h.env.fetch,
                localStorage: h.env.storage,
                crypto: webcrypto,
                location: { origin: payload.config.frontend },
            },
            navigator: { locks: h.env.locks },
            document,
            console: { info() {}, error() {} },
            TextEncoder,
            Uint8Array,
            FormData,
            Blob,
            AbortSignal,
            atob: (s) => Buffer.from(s, "base64").toString("binary"),
            URL,
            setTimeout,
        }
    );
    assert.equal(result.status, "PUBLISHED", result.error);
    assert.equal(h.count, 100);
    assert.ok(
        nodes.some(
            (n) => n.tag === "pre" && n.textContent.includes(result.courseId)
        )
    );
    assert.ok(
        nodes.some(
            (n) => n.tag === "button" && n.textContent === "下載核對報告"
        )
    );
});
