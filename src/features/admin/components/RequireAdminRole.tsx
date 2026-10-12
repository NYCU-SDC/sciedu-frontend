import type { JSX } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchCurrentUser } from "../services/adminRepository";
import AdminPageState from "./AdminPageState";

export default function RequireAdminRole({
    children,
}: {
    children: JSX.Element;
}) {
    const userQuery = useQuery({
        queryKey: ["users", "me"],
        queryFn: fetchCurrentUser,
        staleTime: 5 * 60 * 1000,
    });

    if (userQuery.isPending) {
        return <AdminPageState>正在確認後台權限⋯</AdminPageState>;
    }

    if (userQuery.isError) {
        return <AdminPageState>無法確認後台權限</AdminPageState>;
    }

    const canManageExperiments = userQuery.data.roles.some(
        (role) => role === "EXPERIMENTER" || role === "ADMIN"
    );
    if (!canManageExperiments) {
        return <AdminPageState>你沒有研究管理後台的使用權限</AdminPageState>;
    }

    return children;
}
