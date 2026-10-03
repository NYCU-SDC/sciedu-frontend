import { lazy } from "react";
export const ChatPreview = /* @__PURE__ */ lazy(() => import("./ChatPreview"));
export const CourseChatPreview = /* @__PURE__ */ lazy(() =>
    import("./ChatPreview").then((module) => ({
        default: module.CourseChatPreview,
    }))
);
