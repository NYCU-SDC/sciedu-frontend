import { createBrowserRouter } from "react-router";
import type { RouteObject } from "react-router";
import { AuthProvider } from "./shared/auth";

import GeneticsCourse from "./features/courses/genetics/GeneticsCourse";
import ChatLayout from "./features/chat/pages/ChatLayout";
import NewChatPage from "./features/chat/pages/NewChatPage";
import ChatConversationPage from "./features/chat/pages/ChatConversationPage";
import LoginPage from "./features/auth/pages/LoginPage";
import NotFoundPage from "./shared/components/NotFoundPage";
import RouteErrorBoundary from "./shared/components/RouteErrorBoundary";
import RequireAuth from "./shared/auth/RequireAuth";

const chatRoutes: RouteObject[] = [
    {
        element: (
            <RequireAuth>
                <ChatLayout />
            </RequireAuth>
        ),
        children: [
            {
                path: "/",
                element: <NewChatPage />,
            },
            {
                path: "/chat/:chatID",
                element: <ChatConversationPage />,
            },
        ],
    },
];

const courseRoutes: RouteObject[] = [
    {
        path: "/course/:id",
        element: <GeneticsCourse />,
    },
];

const enableChatRoutes = import.meta.env?.VITE_FEATURE_ENABLE_CHAT === "true";
const enableCourseRoutes =
    import.meta.env?.VITE_FEATURE_ENABLE_COURSE === "true";

export const router = createBrowserRouter([
    {
        element: <AuthProvider />,
        errorElement: <RouteErrorBoundary />,
        children: [
            {
                path: "/login",
                element: <LoginPage />,
            },
            ...(enableChatRoutes ? chatRoutes : []),
            ...(enableCourseRoutes ? courseRoutes : []),
            {
                path: "*",
                element: <NotFoundPage />,
            },
        ],
    },
]);
