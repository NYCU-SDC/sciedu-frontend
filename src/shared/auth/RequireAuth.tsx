import { rememberLoginReturnTo } from "./loginReturnTo";
import { useNavigate } from "react-router";
import { useAuth } from "./AuthContext";
import { useLayoutEffect, type JSX } from "react";

export default function RequireAuth({ children }: { children: JSX.Element }) {
    const { isAuthenticated, isLoading } = useAuth();
    const navigate = useNavigate();

    useLayoutEffect(() => {
        if (!isLoading && !isAuthenticated) {
            rememberLoginReturnTo(
                window.location.pathname + window.location.search
            );
            navigate("/login", { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate]);

    if (isLoading || !isAuthenticated) return null;

    return children;
}
