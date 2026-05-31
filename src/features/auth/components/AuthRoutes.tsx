import { Navigate, Outlet, useLocation } from "react-router";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "../context/useAuth";
import { getAuthReturnPath, getLocationPath } from "../utils/navigation";

function AuthStatusError() {
    return <div role="alert">無法確認登入狀態，請稍後再試。</div>;
}

export function AuthRouteRoot() {
    return (
        <AuthProvider>
            <Outlet />
        </AuthProvider>
    );
}

export function RequireAuth() {
    const location = useLocation();
    const { status, isLoggedIn } = useAuth();

    if (status === "loading") {
        return null;
    }

    if (status === "error") {
        return <AuthStatusError />;
    }

    if (!isLoggedIn) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: getLocationPath(location) }}
            />
        );
    }

    return <Outlet />;
}

export function PublicOnlyAuthRoute() {
    const location = useLocation();
    const { status, isLoggedIn } = useAuth();

    if (status === "loading") {
        return null;
    }

    if (isLoggedIn) {
        return <Navigate to={getAuthReturnPath(location)} replace />;
    }

    return <Outlet />;
}
