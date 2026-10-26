// Narrow, resumable migration: replace seven description references, preserve all other IDs.
export async function reviseDescriptions(plan, env) {
    const { fetch, storage, locks, origin } = env;
    const report = {
        courseId: plan.courseId,
        status: "STOPPED",
        http: [],
        changes: [],
    };
    const key = `sciedu:ccm-description-revision:${plan.origin}:${plan.courseId}:v1`;
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const assert = (ok, message) => {
        if (!ok) throw Error(message);
    };
    const binding = JSON.stringify(plan);
    let state;
    const save = () => {
        const raw = JSON.stringify(state);
        storage.setItem(key, raw);
        assert(storage.getItem(key) === raw, "無法保存進度，已停止");
    };
    const api = async (path, method = "GET", body) => {
        const entry = { path, method, status: null };
        report.http.push(entry);
        const r = await fetch(plan.origin + path, {
            method,
            credentials: "include",
            redirect: "error",
            signal: AbortSignal.timeout(30000),
            ...(body
                ? {
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(body),
                  }
                : {}),
        });
        entry.status = r.status;
        assert(r.ok, `${method} ${path}: HTTP ${r.status}`);
        return r.json();
    };
    try {
        assert(origin === plan.origin, "請在指定 Dev 前端執行");
        await locks.request(key, { ifAvailable: true }, async (lock) => {
            assert(lock, "另一個修正程序執行中");
            await api("/api/auth/session");
            const user = await api("/api/users/me");
            assert(
                user.email === plan.email && user.roles?.includes("ADMIN"),
                "登入帳號或權限不符"
            );
            state = JSON.parse(storage.getItem(key) || "null") || {
                binding,
                actor: user.id,
                items: {},
            };
            assert(
                state.binding === binding && state.actor === user.id,
                "環境、帳號或教材修正版本不符"
            );
            save();
            const course = await api(`/api/courses/${plan.courseId}`);
            assert(
                course.code === "ccm-heart-and-blood" &&
                    course.status === "PUBLISHED",
                "課程或發布狀態不符"
            );
            // Check ALL pages before the first mutation. Never edit questions, hidden metadata, or assignments.
            for (const item of plan.pages) {
                const page = await api(`/api/pages/${item.pageId}`);
                assert(page.courseId === plan.courseId, "課程頁歸屬不符");
                const block = page.blocks.find((b) => b.id === item.blockId);
                assert(
                    block?.type === "TEXT" && block.displayOrder === 0,
                    "教材正文 block 不符"
                );
                const current = await api(
                    `/api/content/text/${block.resourceId}`
                );
                assert(
                    current.content === item.before ||
                        current.content === item.after,
                    "既有正文已變更，停止避免覆蓋"
                );
                const others = page.blocks.filter((b) => b.id !== item.blockId);
                const checkpoint = (state.items[item.pageId] ||= {
                    others,
                    oldId: block.resourceId,
                });
                assert(
                    same(others, checkpoint.others),
                    "其他教材區塊已改變，停止查核"
                );
                if (current.content === item.after) checkpoint.done = true;
                else
                    assert(
                        block.resourceId === checkpoint.oldId,
                        "正文資源已被替換，停止查核"
                    );
            }
            save();
            for (const item of plan.pages) {
                const checkpoint = state.items[item.pageId];
                if (!checkpoint.done) {
                    if (!checkpoint.newId) {
                        assert(
                            !checkpoint.pending,
                            "前次建立 TEXT 結果不明；禁止自動重送，請查核報告"
                        );
                        checkpoint.pending = true;
                        save();
                        const created = await api("/api/content/text", "POST", {
                            content: item.after,
                        });
                        assert(
                            typeof created.id === "string" &&
                                created.id.length > 0,
                            "建立回覆缺少 ID；停止查核"
                        );
                        checkpoint.newId = created.id;
                        save();
                    }
                    const text = await api(
                        `/api/content/text/${checkpoint.newId}`
                    );
                    assert(text.content === item.after, "新正文內容不符");
                    const page = await api(`/api/pages/${item.pageId}`);
                    const block = page.blocks.find(
                        (b) => b.id === item.blockId
                    );
                    assert(
                        same(
                            page.blocks.filter((b) => b.id !== item.blockId),
                            checkpoint.others
                        ),
                        "其他教材區塊已變更"
                    );
                    assert(
                        block.resourceId === checkpoint.oldId ||
                            block.resourceId === checkpoint.newId,
                        "正文被其他操作修改"
                    );
                    if (block.resourceId !== checkpoint.newId) {
                        try {
                            await api(
                                `/api/pages/${item.pageId}/blocks/${item.blockId}`,
                                "PUT",
                                {
                                    type: "TEXT",
                                    resourceId: checkpoint.newId,
                                    displayOrder: 0,
                                    required: block.required,
                                }
                            );
                        } catch (error) {
                            // PUT outcome unknown: read back, never pretend success or automatically repeat.
                            const checked = await api(
                                `/api/pages/${item.pageId}`
                            );
                            if (
                                checked.blocks.find(
                                    (b) => b.id === item.blockId
                                )?.resourceId !== checkpoint.newId
                            )
                                throw error;
                        }
                    }
                }
                const checked = await api(`/api/pages/${item.pageId}`);
                const block = checked.blocks.find((b) => b.id === item.blockId);
                const text = await api(`/api/content/text/${block.resourceId}`);
                assert(
                    text.content === item.after &&
                        same(
                            checked.blocks.filter((b) => b.id !== item.blockId),
                            checkpoint.others
                        ),
                    "修正後核對失敗"
                );
                checkpoint.done = true;
                save();
                report.changes.push({
                    pageId: item.pageId,
                    blockId: item.blockId,
                    oldTextId: checkpoint.oldId,
                    newTextId: block.resourceId,
                });
            }
            assert(
                (await api(`/api/courses/${plan.courseId}`)).status ===
                    "PUBLISHED",
                "最終發布狀態不符"
            );
            report.status = "VERIFIED";
        });
    } catch (error) {
        report.error = error.message;
    }
    report.checkpoints = state?.items;
    return report;
}
