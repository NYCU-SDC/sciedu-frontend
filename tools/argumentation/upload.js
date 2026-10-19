const BASE = "https://dev.sciedu.sdc.nycu.club",
    out = document.querySelector("#log");
let courses,
    state,
    actor,
    busy = false;
const log = (s) => (out.textContent += "\n" + s);
const digest = async (raw) =>
    Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", raw)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
async function api(path, method = "GET", body) {
    if (state?.complete && method !== "GET")
        throw Error("已完成的批次禁止新增寫入");
    const r = await fetch(BASE + path, {
        signal: AbortSignal.timeout(30000),
        method,
        credentials: "include",
        redirect: "error",
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
    if (state) (state.http ??= []).push({ method, path, status: r.status });
    if (!r.ok) throw Error(`${method} ${path}: HTTP ${r.status}`);
    return r.headers.get("Content-Type")?.includes("json")
        ? r.json()
        : r.arrayBuffer();
}
async function save() {
    const r = await fetch("/state.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
    });
    if (!r.ok) throw Error("無法保存進度，已停止");
}
async function inspect() {
    out.textContent = "檢查中…";
    courses = [await (await fetch("/manifest.json")).json()];
    await api("/api/auth/session");
    actor = await api("/api/users/me");
    const fingerprint = await digest(
        new TextEncoder().encode(JSON.stringify(courses))
    );
    state = await (await fetch("/state.json")).json();
    if (
        state &&
        (state.origin !== BASE ||
            state.actorId !== actor.id ||
            state.fingerprint !== fingerprint)
    )
        throw Error("上傳狀態的環境、帳號或內容不符");
    state ??= {
        version: 1,
        origin: BASE,
        actorId: actor.id,
        fingerprint,
        items: {},
        courses: [],
    };
    let existing = [];
    for (let page = 1; ; page++) {
        const result = await api(`/api/courses?page=${page}&pageSize=100`);
        const items = result.items ?? result.data ?? result.courses;
        if (!Array.isArray(items))
            throw Error("未知教材列表格式: " + JSON.stringify(result));
        existing.push(...items);
        if (items.length < 100) break;
    }
    log(
        "管理帳號已驗證。既有教材：" +
            JSON.stringify(
                existing.map((c) => ({
                    id: c.id,
                    title: c.title,
                    code: c.code,
                    status: c.status,
                })),
                null,
                2
            )
    );
    for (const c of courses) {
        const matches = existing.filter(
            (e) => e.code === c.code || e.title === c.title
        );
        const own = state.items[c.code + ":course"];
        if (matches.some((e) => e.id !== own?.id))
            throw Error("已有同名教材，必須先人工核對：" + c.title);
    }
    await save();
    document.querySelector("#upload").disabled = false;
    if (state.complete)
        document.querySelector("#upload").textContent =
            "重新核對四頁草稿（唯讀）";
    log("檢查通過：可上傳並核對 4 頁、2 題、2 次預覽圖引用。");
}
async function ensure(key, path, payload, get, verify) {
    let item = state.items[key];
    if (item?.status === "pending" && !item.id)
        throw Error(key + " 上次結果不明，禁止重送；請人工核對");
    if (!item) {
        if (state.activeCourse) {
            const c = await api("/api/courses/" + state.activeCourse);
            if (c.status !== "DRAFT") throw Error("課程已非草稿");
        }
        item = state.items[key] = { status: "pending", path };
        await save();
        const created = await api(path, "POST", payload);
        if (!created.id) throw Error("建立回應缺少 ID");
        item.id = created.id;
        await save();
    }
    const actual = await api(get.replace("{id}", item.id));
    if (!(await verify(actual, item.id))) throw Error("核對失敗 " + key);
    item.status = "verified";
    await save();
    log("已核對 " + key + " " + item.id);
    return item.id;
}
const equals = (x, p) => Object.entries(p).every(([k, v]) => x[k] === v);
const text = (key, value) =>
    ensure(
        key,
        "/api/content/text",
        { content: value },
        "/api/content/text/{id}",
        (r) => r.type === "TEXT" && r.content === value.trim()
    );
const block = (key, page, type, id, order, required = true) => {
    const p = { type, resourceId: id, displayOrder: order, required };
    return ensure(
        key,
        `/api/pages/${page}/blocks`,
        p,
        `/api/pages/${page}/blocks`,
        (rs, bid) => rs.some((r) => r.id === bid && equals(r, p))
    );
};
async function upload() {
    for (const c of courses) {
        state.activeCourse = null;
        const p = { code: c.code, title: c.title };
        const cid = await ensure(
            c.code + ":course",
            "/api/courses",
            p,
            "/api/courses/{id}",
            (r) => equals(r, p) && r.status === "DRAFT"
        );
        state.activeCourse = cid;
        for (const [pi, page] of c.pages.entries()) {
            const k = c.code + ":" + page.code,
                pp = { title: page.title, displayOrder: pi };
            const pid = await ensure(
                k + ":page",
                `/api/courses/${cid}/pages`,
                pp,
                "/api/pages/{id}",
                (r) => r.courseId === cid && equals(r, pp)
            );
            await block(
                k + ":block:description",
                pid,
                "TEXT",
                await text(k + ":description", page.description),
                0
            );
            for (const [i, img] of page.images.entries()) {
                const blob = await (await fetch("/" + img.file)).blob();
                if ((await digest(await blob.arrayBuffer())) !== img.sha256)
                    throw Error("本機圖片指紋不符");
                const form = new FormData();
                form.append("content", blob, img.file.split("/").pop());
                const id = await ensure(
                    k + ":image:" + i,
                    "/api/content/media",
                    form,
                    "/api/content/media/{id}",
                    async (raw) => (await digest(raw)) === img.sha256
                );
                await block(
                    k + ":block:image:" + i,
                    pid,
                    "MEDIA",
                    id,
                    10 + i * 10
                );
            }
            for (const [i, q] of page.questions.entries()) {
                await block(
                    k + ":block:question-title:" + i,
                    pid,
                    "TEXT",
                    await text(
                        k + ":question-title:" + i,
                        q.label ?? String(q.sourceNumber)
                    ),
                    100 + i * 10
                );
                const qp = { type: q.type, content: q.prompt };
                const qid = await ensure(
                    k + ":question:" + i,
                    "/api/questions",
                    qp,
                    "/api/questions/{id}",
                    (r) => equals(r, qp)
                );
                await block(
                    k + ":block:question:" + i,
                    pid,
                    "QUESTION",
                    qid,
                    101 + i * 10
                );
            }
            await block(
                k + ":block:metadata",
                pid,
                "TEXT",
                await text(k + ":metadata", page.imageDescriptionForLLM),
                200,
                false
            );
            await block(
                k + ":block:presentation",
                pid,
                "TEXT",
                await text(
                    k + ":presentation",
                    JSON.stringify(page.presentation)
                ),
                201,
                false
            );
            const blocks = await api(`/api/pages/${pid}/blocks`);
            if (
                blocks.length !==
                3 + page.images.length + page.questions.length * 2
            )
                throw Error("PageBlock 數量不符");
        }
        const pages = await api(`/api/courses/${cid}/pages`);
        if (pages.length !== c.pages.length) throw Error("頁數不符");
        if ((await api("/api/courses/" + cid)).status !== "DRAFT")
            throw Error("最後狀態非 DRAFT");
        if (!state.courses.some((x) => x.id === cid))
            state.courses.push({
                id: cid,
                code: c.code,
                title: c.title,
                status: "DRAFT",
            });
        await save();
    }
    state.complete = true;
    state.verifiedAt = new Date().toISOString();
    await save();
    document.querySelector("#result").textContent =
        `已核對完成：${state.courses[0].title}｜DRAFT｜課程 ID ${state.courses[0].id}`;
    log("全部上傳並核對完成：" + JSON.stringify(state.courses, null, 2));
}
async function run(fn) {
    if (busy) return;
    busy = true;
    document.querySelectorAll("button").forEach((b) => (b.disabled = true));
    try {
        await navigator.locks.request(
            "sciedu-argumentation-dev-upload",
            { ifAvailable: true },
            async (lock) => {
                if (!lock) throw Error("另一分頁正在上傳");
                await fn();
            }
        );
    } catch (e) {
        log("停止：" + e.message);
    } finally {
        busy = false;
        document.querySelector("#inspect").disabled = false;
    }
}
document.querySelector("#inspect").onclick = () => run(inspect);
document.querySelector("#upload").onclick = () => run(upload);
