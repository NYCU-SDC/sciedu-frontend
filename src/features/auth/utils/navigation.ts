import type { Location } from "react-router";

type AuthLocationState = {
    from?: string;
};

export function getLocationPath(
    location: Pick<Location, "pathname" | "search" | "hash">
) {
    return `${location.pathname}${location.search}${location.hash}`;
}

export function getAuthReturnPath(location: Location) {
    const state = location.state as AuthLocationState | null;
    const from = state?.from;

    if (from && from !== "/login") {
        return from;
    }

    const currentPath = getLocationPath(location);
    return currentPath === "/login" ? "/" : currentPath;
}
