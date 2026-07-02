import { useNavigate } from "react-router";
import { useAuth } from "./AuthContext";
import { useLayoutEffect, type JSX } from "react";

export default function RequireAuth({ children }: { children: JSX.Element }) {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useLayoutEffect(() => {
        if (!isAuthenticated) navigate("/login");
    }, [isAuthenticated, navigate]);

    if (!isAuthenticated) return null;

    return children;
}
