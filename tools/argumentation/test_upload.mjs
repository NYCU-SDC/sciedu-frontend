import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const code = readFileSync(new URL("./upload.js", import.meta.url), "utf8");
function harness(items = {}, respond = () => ({ id: "new" })) {
    const requests = [];
    const dom = new Map();
    const context = vm.createContext({
        document: {
            querySelector: (selector) => {
                if (!dom.has(selector)) dom.set(selector, {});
                return dom.get(selector);
            },
        },
        navigator: {},
        FormData,
        AbortSignal,
        fetch: async (url, options = {}) => {
            requests.push({
                url,
                method: options.method ?? "GET",
                body: options.body,
            });
            const result =
                url === "/state.json" ? {} : await respond(url, options);
            return {
                ok: true,
                status: 200,
                headers: new Headers({ "Content-Type": "application/json" }),
                json: async () => result,
            };
        },
    });
    vm.runInContext(code, context);
    vm.runInContext(`state=${JSON.stringify({ items })}`, context);
    return {
        requests,
        run: (expr) => vm.runInContext(expr, context),
        read: () =>
            JSON.parse(vm.runInContext("JSON.stringify(state)", context)),
    };
}
test("unknown pending result is never retried", async () => {
    const h = harness({
        operation: { status: "pending", path: "/api/courses" },
    });
    await assert.rejects(
        h.run(
            "ensure('operation','/api/courses',{},'/api/courses/{id}',()=>true)"
        ),
        /禁止重送/
    );
    assert.equal(h.requests.length, 0);
});
test("checkpoints pending before POST and ID before verification; verified rerun is read only", async () => {
    const h = harness();
    await h.run(
        "ensure('operation','/api/courses',{},'/api/courses/{id}',()=>true)"
    );
    assert.equal(h.requests[0].url, "/state.json");
    assert.equal(
        JSON.parse(h.requests[0].body).items.operation.status,
        "pending"
    );
    assert.equal(h.requests[1].method, "POST");
    assert.equal(JSON.parse(h.requests[2].body).items.operation.id, "new");
    assert.equal(h.requests[3].method, "GET");
    assert.equal(h.read().items.operation.status, "verified");
    h.requests.length = 0;
    await h.run(
        "ensure('operation','/api/courses',{},'/api/courses/{id}',()=>true)"
    );
    assert.equal(
        h.requests.filter(
            (r) => r.url.startsWith("https:") && r.method === "POST"
        ).length,
        0
    );
});
test("network failure leaves a durable pending record and stops", async () => {
    const h = harness({}, () => {
        throw Error("connection lost");
    });
    await assert.rejects(
        h.run(
            "ensure('operation','/api/courses',{},'/api/courses/{id}',()=>true)"
        ),
        /connection lost/
    );
    assert.deepEqual(h.read().items.operation, {
        status: "pending",
        path: "/api/courses",
    });
    assert.equal(h.requests.length, 2);
});
test("published parent prevents creating additional resources", async () => {
    const h = harness({}, () => ({ status: "PUBLISHED" }));
    h.run("state.activeCourse='course'");
    await assert.rejects(
        h.run(
            "ensure('page','/api/courses/course/pages',{},'/api/pages/{id}',()=>true)"
        ),
        /已非草稿/
    );
    assert.equal(h.requests.length, 1);
    assert.equal(h.requests[0].method, "GET");
});
