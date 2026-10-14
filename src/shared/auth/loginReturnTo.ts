const KEY = "sciedu-login-return-to";
export function safeReturnTo(value: string | null): string {
    if (
        !value ||
        !value.startsWith("/") ||
        value.startsWith("//") ||
        value.includes("\\") ||
        Array.from(value).some((character) => character.charCodeAt(0) < 32) ||
        value.startsWith("/login")
    )
        return "/";
    return value;
}
export function rememberLoginReturnTo(path: string) {
    try {
        sessionStorage.setItem(KEY, safeReturnTo(path));
    } catch {
        /* Default home remains available. */
    }
}
export function loginReturnTo() {
    try {
        return safeReturnTo(sessionStorage.getItem(KEY));
    } catch {
        return "/";
    }
}
export function clearLoginReturnTo() {
    try {
        sessionStorage.removeItem(KEY);
    } catch {
        /* unavailable */
    }
}
