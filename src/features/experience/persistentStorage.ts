export function readPersistent(key: string): string | null {
    const value = localStorage.getItem(key);
    if (value !== null) return value;
    const legacy = sessionStorage.getItem(key);
    if (legacy !== null) {
        writePersistent(key, legacy);
        sessionStorage.removeItem(key);
    }
    return legacy;
}
export function writePersistent(key: string, value: string) {
    localStorage.setItem(key, value);
    if (localStorage.getItem(key) !== value)
        throw new Error("無法保存學習進度");
}
export function clearPersistent(prefix: string) {
    for (const storage of [localStorage, sessionStorage])
        for (const key of Object.keys(storage))
            if (key.startsWith(prefix)) storage.removeItem(key);
}
