import { test } from "node:test";
import assert from "node:assert/strict";
import { reviseDescriptions } from "./revise_descriptions.mjs";
function fixture() {
    const plan = {
        origin: "https://dev.example",
        email: "admin@example.test",
        courseId: "course",
        pages: [
            { pageId: "p", blockId: "body", before: "old", after: "## STEP 1" },
        ],
    };
    const texts = { old: { id: "old", content: "old" } };
    const page = {
        id: "p",
        courseId: "course",
        blocks: [
            {
                id: "body",
                type: "TEXT",
                resourceId: "old",
                displayOrder: 0,
                required: false,
            },
            {
                id: "q",
                type: "QUESTION",
                resourceId: "question",
                displayOrder: 101,
                required: true,
            },
        ],
    };
    const saved = new Map();
    let count = 0;
    const calls = [];
    const env = {
        origin: plan.origin,
        storage: {
            getItem: (k) => saved.get(k) ?? null,
            setItem: (k, v) => saved.set(k, v),
        },
        locks: { request: async (_k, _o, fn) => fn({}) },
        fetch: async (url, options) => {
            const path = new URL(url).pathname;
            calls.push(options.method + " " + path);
            let data;
            if (path === "/api/auth/session") data = {};
            else if (path === "/api/users/me")
                data = { id: "admin", email: plan.email, roles: ["ADMIN"] };
            else if (path === "/api/courses/course")
                data = { code: "ccm-heart-and-blood", status: "PUBLISHED" };
            else if (path === "/api/pages/p") data = page;
            else if (path === "/api/content/text") {
                data = { id: "new" + ++count, ...JSON.parse(options.body) };
                texts[data.id] = data;
            } else if (path.startsWith("/api/content/text/"))
                data = texts[path.split("/").pop()];
            else if (path === "/api/pages/p/blocks/body") {
                Object.assign(page.blocks[0], JSON.parse(options.body));
                data = page.blocks[0];
            } else throw Error(path);
            return {
                ok: true,
                status: options.method === "POST" ? 201 : 200,
                json: async () => structuredClone(data),
            };
        },
    };
    return { plan, env, texts, page, calls };
}
test("updates only description reference, re-run does not create another text", async () => {
    const f = fixture();
    assert.equal((await reviseDescriptions(f.plan, f.env)).status, "VERIFIED");
    assert.deepEqual(f.page.blocks[1], {
        id: "q",
        type: "QUESTION",
        resourceId: "question",
        displayOrder: 101,
        required: true,
    });
    assert.equal((await reviseDescriptions(f.plan, f.env)).status, "VERIFIED");
    assert.equal(f.calls.filter((c) => c.startsWith("POST")).length, 1);
    assert.ok(f.texts.old);
});
test("committed POST with lost reply stops and refuses duplicate creation after restart", async () => {
    const f = fixture(),
        original = f.env.fetch;
    f.env.fetch = async (...args) => {
        const r = await original(...args);
        if (args[1].method === "POST") throw Error("reply lost");
        return r;
    };
    assert.equal((await reviseDescriptions(f.plan, f.env)).status, "STOPPED");
    f.env.fetch = original;
    assert.match((await reviseDescriptions(f.plan, f.env)).error, /結果不明/);
    assert.equal(f.calls.filter((c) => c.startsWith("POST")).length, 1);
});
test("committed PUT with lost reply reads back and verifies", async () => {
    const f = fixture(),
        original = f.env.fetch;
    f.env.fetch = async (...args) => {
        const r = await original(...args);
        if (args[1].method === "PUT") throw Error("reply lost");
        return r;
    };
    assert.equal((await reviseDescriptions(f.plan, f.env)).status, "VERIFIED");
});
test("rejects foreign origin and unexpected existing content before mutations", async () => {
    const f = fixture();
    f.env.origin = "https://other.example";
    assert.equal((await reviseDescriptions(f.plan, f.env)).status, "STOPPED");
    assert.equal(f.calls.length, 0);
    f.env.origin = f.plan.origin;
    f.texts.old.content = "other edit";
    assert.match((await reviseDescriptions(f.plan, f.env)).error, /正文已變更/);
    assert.ok(f.calls.every((c) => c.startsWith("GET")));
});
