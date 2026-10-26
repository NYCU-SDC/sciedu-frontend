// Browser-independent engine. The bundle supplies immutable main content and assets.
export async function uploadMaterial(pack, env) {
    const { fetch, storage, locks, crypto, origin, log = () => {} } = env;
    const { manifest: m, assets, config: c } = pack;
    const key = `sciedu:one-time-upload:${c.backend}:${m.code}`;
    const report = {
        version: c.version,
        sourceCommit: c.commit,
        backend: c.backend,
        courseCode: m.code,
        startedAt: new Date().toISOString(),
        status: "STOPPED",
        http: [],
        checks: [],
    };
    let state, binding;
    const fail = (message) => {
        throw new Error(message);
    };
    const hash = async (bytes) =>
        [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
            .map((x) => x.toString(16).padStart(2, "0"))
            .join("");
    const equal = (actual, expected, label) => {
        for (const [field, value] of Object.entries(expected)) {
            if (actual?.[field] !== value)
                fail(`${label}：${field} 不符；停止，不覆寫既有教材`);
        }
    };
    const idOf = (value, label) => {
        if (
            !value ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                value.id
            )
        )
            fail(`${label}：資源 ID 格式不符`);
        return value.id;
    };
    function save() {
        const raw = JSON.stringify(state);
        storage.setItem(key, raw);
        if (storage.getItem(key) !== raw)
            fail("進度保存失敗；禁止繼續寫入後端");
    }
    async function api(path, method = "GET", body, binary = false) {
        const entry = { method, path, status: null };
        report.http.push(entry);
        let response;
        try {
            response = await fetch(c.backend + path, {
                method,
                credentials: "include",
                redirect: "error",
                signal: AbortSignal.timeout(30000),
                headers:
                    body && !(body instanceof FormData)
                        ? { "Content-Type": "application/json" }
                        : {},
                body:
                    body instanceof FormData
                        ? body
                        : body
                          ? JSON.stringify(body)
                          : undefined,
            });
        } catch {
            fail(
                `${method} ${path}：網路失敗或逾時；結果可能不明，禁止盲目重送`
            );
        }
        entry.status = response.status;
        if (!response.ok) {
            const error = new Error(
                `${method} ${path}：HTTP ${response.status}` +
                    (response.status === 401
                        ? "；請重新登入相同帳號，再執行同一份腳本"
                        : "；已停止")
            );
            error.status = response.status;
            throw error;
        }
        try {
            return binary
                ? await response.arrayBuffer()
                : await response.json();
        } catch {
            fail(`${method} ${path}：無法解析回覆；結果可能不明，停止查核`);
        }
    }
    async function listCourses(query = "") {
        const result = [],
            seen = new Set();
        for (let page = 1; page <= 10000; page++) {
            const response = await api(
                `/api/courses?page=${page}&pageSize=100${query}`
            );
            if (
                !Array.isArray(response.items) ||
                response.currentPage !== page ||
                typeof response.hasNextPage !== "boolean"
            )
                fail("教材分頁格式不符");
            for (const course of response.items) {
                const id = idOf(course, "教材列表");
                if (seen.has(id)) fail("教材分頁出現重複 ID；停止以免漏查");
                seen.add(id);
                result.push(course);
            }
            if (!response.hasNextPage) return result;
        }
        fail("教材分頁超出上限");
    }
    const blocksFor = (page) => [
        {
            key: "description",
            type: "TEXT",
            order: 0,
            required: true,
            text: page.description,
        },
        ...page.images.map((image, i) => ({
            key: `image:${i}`,
            type: "MEDIA",
            order: 10 + i * 10,
            required: true,
            image,
        })),
        ...page.questions.flatMap((q, i) => [
            {
                key: `question-title:${i}`,
                type: "TEXT",
                order: 100 + i * 10,
                required: true,
                text: q.label ?? String(q.sourceNumber),
            },
            {
                key: `question:${i}`,
                type: "QUESTION",
                order: 101 + i * 10,
                required: true,
                question: q,
            },
        ]),
        {
            key: "metadata",
            type: "TEXT",
            order: 200,
            required: false,
            text: page.imageDescriptionForLLM,
        },
        {
            key: "presentation",
            type: "TEXT",
            order: 201,
            required: false,
            text: JSON.stringify(page.presentation),
        },
    ];
    async function verifyResource(expected, id) {
        if (expected.type === "MEDIA") {
            const bytes = await api(
                `/api/content/media/${id}`,
                "GET",
                undefined,
                true
            );
            if ((await hash(bytes)) !== expected.image.sha256)
                fail("遠端圖片 SHA-256 不符");
        } else if (expected.type === "TEXT") {
            equal(
                await api(`/api/content/text/${id}`),
                { id, type: "TEXT", content: expected.text.trim() },
                expected.key
            );
        } else {
            equal(
                await api(`/api/questions/${id}`),
                {
                    id,
                    type: expected.question.type,
                    content: expected.question.prompt,
                },
                expected.key
            );
        }
    }
    async function verifyCourse(cid) {
        const course = await api(`/api/courses/${cid}`);
        equal(course, { id: cid, code: m.code, title: m.title }, "教材");
        if (!["DRAFT", "PUBLISHED"].includes(course.status))
            fail(`教材狀態不允許：${course.status}`);
        const pages = await api(`/api/courses/${cid}/pages`);
        if (!Array.isArray(pages) || pages.length !== m.pages.length)
            fail("頁數不符");
        const resources = new Set([cid]),
            questions = new Set(),
            media = new Set(),
            rows = [];
        for (const [pi, page] of m.pages.entries()) {
            const matches = pages.filter((p) => p.displayOrder === pi);
            if (matches.length !== 1) fail(`第 ${pi + 1} 頁排序不符`);
            const actual = matches[0],
                pid = idOf(actual, "頁面");
            equal(
                actual,
                { courseId: cid, title: page.title, displayOrder: pi },
                `第 ${pi + 1} 頁`
            );
            if (resources.has(pid)) fail("頁面 ID 重複");
            resources.add(pid);
            const blocks = await api(`/api/pages/${pid}/blocks`),
                expected = blocksFor(page);
            if (!Array.isArray(blocks) || blocks.length !== expected.length)
                fail(`第 ${pi + 1} 頁區塊數量不符`);
            const row = {
                pageId: pid,
                title: page.title,
                chatEnabled: page.presentation.chatEnabled,
                blocks: [],
            };
            for (const item of expected) {
                const candidates = blocks.filter(
                    (b) => b.displayOrder === item.order
                );
                if (candidates.length !== 1)
                    fail(`第 ${pi + 1} 頁 ${item.key} 排序不符`);
                const b = candidates[0];
                idOf(b, "區塊");
                idOf({ id: b.resourceId }, "內容");
                equal(
                    b,
                    { type: item.type, required: item.required },
                    `第 ${pi + 1} 頁 ${item.key}`
                );
                if (
                    resources.has(b.id) ||
                    resources.has(b.resourceId) ||
                    b.id === b.resourceId
                )
                    fail("區塊或內容 ID 重複");
                resources.add(b.id);
                resources.add(b.resourceId);
                await verifyResource(item, b.resourceId);
                if (item.type === "QUESTION") questions.add(b.resourceId);
                if (item.type === "MEDIA") media.add(b.resourceId);
                row.blocks.push({
                    id: b.id,
                    resourceId: b.resourceId,
                    type: b.type,
                    displayOrder: b.displayOrder,
                    required: b.required,
                });
            }
            rows.push(row);
        }
        const expectedBlocks = m.pages.flatMap(blocksFor);
        const counts = {
            courses: 1,
            pages: m.pages.length,
            texts: expectedBlocks.filter((b) => b.type === "TEXT").length,
            media: expectedBlocks.filter((b) => b.type === "MEDIA").length,
            questions: expectedBlocks.filter((b) => b.type === "QUESTION")
                .length,
            blocks: expectedBlocks.length,
        };
        counts.total = 1 + counts.pages + 2 * counts.blocks;
        if (
            resources.size !== counts.total ||
            questions.size !== counts.questions ||
            media.size !== counts.media
        )
            fail("總資源 ID 核對失敗");
        report.courseId = cid;
        report.courseUrl = `${c.frontend}/course/${cid}`;
        report.pages = rows;
        report.counts = counts;
        report.checks.push({
            check: "完整教材內容／圖片雜湊／順序／設定",
            result: "PASS",
        });
        return course;
    }
    async function ensure(op, path, payload, get, verify) {
        let item = state.items[op];
        if (item && !item.id && item.status !== "rejected401")
            fail(`${op}：前次結果不明或遭拒，禁止重送；請保留進度檔查核`);
        if (!item?.id) {
            if (
                state.courseId &&
                (await api(`/api/courses/${state.courseId}`)).status !== "DRAFT"
            )
                fail("已非 DRAFT，禁止建立子資源");
            state.items[op] = item = { path, status: "pending" };
            save();
            try {
                const created = await api(path, "POST", payload);
                item.id = idOf(created, op);
            } catch (error) {
                if (error.status === 401) {
                    item.status = "rejected401";
                    save();
                } else if ([400, 403, 409].includes(error.status)) {
                    item.status = "rejected";
                    item.httpStatus = error.status;
                    save();
                }
                throw error;
            }
            save();
        }
        idOf(item, op);
        await verify(
            await api(
                get.replace("{id}", item.id),
                "GET",
                undefined,
                path === "/api/content/media"
            ),
            item.id
        );
        item.status = "verified";
        save();
        log(`已核對 ${op}`);
        return item.id;
    }
    async function create() {
        const cid = await ensure(
            "course",
            "/api/courses",
            { code: m.code, title: m.title },
            "/api/courses/{id}",
            (r) => {
                equal(r, { code: m.code, title: m.title }, "教材");
                if (r.status !== "DRAFT") fail("續傳僅允許 DRAFT");
            }
        );
        state.courseId = cid;
        save();
        for (const [pi, page] of m.pages.entries()) {
            const prefix = page.code;
            const pid = await ensure(
                `${prefix}:page`,
                `/api/courses/${cid}/pages`,
                { title: page.title, displayOrder: pi },
                "/api/pages/{id}",
                (r) =>
                    equal(
                        r,
                        { courseId: cid, title: page.title, displayOrder: pi },
                        prefix
                    )
            );
            for (const b of blocksFor(page)) {
                let path, payload, get;
                if (b.type === "MEDIA") {
                    path = "/api/content/media";
                    payload = new FormData();
                    payload.append(
                        "content",
                        new Blob([env.decodeBase64(assets[b.image.file])], {
                            type: b.image.mimeType ?? "image/jpeg",
                        }),
                        b.image.file.split("/").at(-1)
                    );
                    get = "/api/content/media/{id}";
                } else if (b.type === "TEXT") {
                    path = "/api/content/text";
                    payload = { content: b.text };
                    get = "/api/content/text/{id}";
                } else {
                    path = "/api/questions";
                    payload = {
                        type: b.question.type,
                        content: b.question.prompt,
                    };
                    get = "/api/questions/{id}";
                }
                const rid = await ensure(
                    `${prefix}:${b.key}`,
                    path,
                    payload,
                    get,
                    async (r, id) => {
                        if (b.type === "MEDIA") {
                            if ((await hash(r)) !== b.image.sha256)
                                fail("圖片指紋不符");
                        } else
                            equal(
                                r,
                                {
                                    ...payload,
                                    ...(b.type === "TEXT"
                                        ? {
                                              type: "TEXT",
                                              content: payload.content.trim(),
                                          }
                                        : {}),
                                    id,
                                },
                                b.key
                            );
                    }
                );
                const bp = {
                    type: b.type,
                    resourceId: rid,
                    displayOrder: b.order,
                    required: b.required,
                };
                await ensure(
                    `${prefix}:block:${b.key}`,
                    `/api/pages/${pid}/blocks`,
                    bp,
                    `/api/pages/${pid}/blocks`,
                    (r, id) => {
                        if (!Array.isArray(r)) fail("區塊列表格式不符");
                        const found = r.filter((x) => x.id === id);
                        if (found.length !== 1) fail("區塊 ID 未找到");
                        equal(found[0], bp, b.key);
                    }
                );
            }
        }
        return cid;
    }
    async function perform() {
        if (origin !== c.frontend)
            fail(`只能在 ${c.frontend} 的已登入頁面執行`);
        const fingerprint = await hash(
            new TextEncoder().encode(JSON.stringify(m))
        );
        if (fingerprint !== c.manifestSha256) fail("教材 manifest 指紋不符");
        for (const p of m.pages)
            for (const image of p.images) {
                if (
                    !assets[image.file] ||
                    (await hash(env.decodeBase64(assets[image.file]))) !==
                        image.sha256
                )
                    fail("內嵌圖片指紋不符");
            }
        report.checks.push({ check: "內嵌教材與圖片", result: "PASS" });
        await api("/api/auth/session");
        const actor = await api("/api/users/me");
        if (
            actor.email?.toLowerCase() !== c.email ||
            !actor.roles?.includes("ADMIN")
        )
            fail("需以指定帳號與 ADMIN 權限登入；未進行上傳");
        idOf(actor, "登入使用者");
        binding = {
            version: c.version,
            backend: c.backend,
            frontend: c.frontend,
            actorId: actor.id,
            fingerprint,
            commit: c.commit,
        };
        const raw = storage.getItem(key);
        if (raw) {
            try {
                state = JSON.parse(raw);
            } catch {
                fail("進度檔損壞，請保留查核，不要刪除後重跑");
            }
            equal(state.binding, binding, "進度綁定");
            if (
                !state.items ||
                typeof state.items !== "object" ||
                Array.isArray(state.items)
            )
                fail("進度格式不符");
        } else state = { binding, items: {}, courseId: null };
        save();
        const all = await listCourses();
        const matches = all.filter(
            (x) => x.code === m.code || x.title === m.title
        );
        if (matches.length > 1)
            fail("同 code／名稱有多份教材，禁止自動選擇或建立");
        for (const [op, item] of Object.entries(state.items))
            if (!item.id && item.status !== "rejected401")
                fail(`${op}：既有待查核操作，禁止重送或自動接管`);
        let cid = state.courseId ?? state.items.course?.id;
        if (cid && (matches.length !== 1 || matches[0].id !== cid))
            fail("進度所指教材與遠端列表不符");
        if (!cid && matches.length === 1) {
            cid = idOf(matches[0], "既有教材");
            await verifyCourse(cid); // Never adopt an incomplete external course.
            state.courseId = cid;
            state.adopted = true;
            save();
        } else if (!cid || (!state.complete && !state.adopted)) {
            // A previous publish can only occur after complete=true was durably saved.
            cid = await create();
        }
        const verified = await verifyCourse(cid);
        state.complete = true;
        state.verifiedAt = new Date().toISOString();
        save();
        if (verified.status === "DRAFT") {
            // Explicit rerun rechecks the remote state before retrying this status-only PUT.
            state.publication = {
                status: "pending",
                requestedAt: new Date().toISOString(),
            };
            save();
            try {
                await api(`/api/courses/${cid}/status`, "PUT", {
                    status: "PUBLISHED",
                });
            } catch (error) {
                const checked = await api(`/api/courses/${cid}`);
                if (checked.status !== "PUBLISHED") throw error;
                equal(
                    checked,
                    { id: cid, code: m.code, title: m.title },
                    "發布結果"
                );
                report.checks.push({
                    check: "發布回覆失敗後 GET 確認",
                    result: "PASS",
                });
            }
        }
        const final = await api(`/api/courses/${cid}`);
        equal(
            final,
            { id: cid, code: m.code, title: m.title, status: "PUBLISHED" },
            "最終發布狀態"
        );
        const published = await listCourses("&status=PUBLISHED");
        if (!published.some((x) => x.id === cid && x.status === "PUBLISHED"))
            fail("已發布，但未出現在可選教材列表");
        state.publication = {
            status: "PUBLISHED",
            verifiedAt: new Date().toISOString(),
        };
        save();
        report.status = "PUBLISHED";
        report.checks.push({ check: "發布與可選教材清單", result: "PASS" });
        log(
            `完成：${m.title}\n${report.courseUrl}\nPUBLISHED；未建立實驗、未指派學生。`
        );
    }
    try {
        if (!locks?.request) fail("瀏覽器不支援 Web Locks，未執行上傳");
        await locks.request(key, { ifAvailable: true }, async (lock) => {
            if (!lock) fail("另一分頁正在上傳，請勿同時執行");
            await perform();
        });
    } catch (error) {
        report.error = error.message;
        log(`停止：${error.message}`);
    }
    report.finishedAt = new Date().toISOString();
    report.resources = state?.items ?? {};
    report.publication = state?.publication ?? null;
    report.checkpointKey = key;
    report.notVerified = ["學生實驗指派與作答", "真實 Chat／preset 執行結果"];
    return report;
}
