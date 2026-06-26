import { createBrowserRouter } from "react-router";
import type { RouteObject } from "react-router";
import { AuthProvider } from "./shared/auth";

import GeneticsCourse from "./features/courses/genetics/GeneticsCourse";
import ChatPage from "./features/chat/pages/ChatPage";
import ExampleChatPage from "./features/chat/pages/ExampleChatPage";
import LoginPage from "./features/auth/pages/LoginPage";
import RedirectToLogin from "./features/auth/pages/RedirectToLogin";
import NotFoundPage from "./shared/components/NotFoundPage";
import RouteErrorBoundary from "./shared/components/RouteErrorBoundary";

const chatRoutes: RouteObject[] = [
    {
        path: "/chat",
        element: <ChatPage />,
    },
    {
        path: "/examplechat",
        element: <ExampleChatPage />,
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
                path: "/",
                element: <RedirectToLogin />,
            },
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
