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
<<<<<<< HEAD
import Homepage from "./features/courses/Homepage/Homepage";
import MaterialLibrary from "./features/courses/MaterialLibrary/MaterialLibrary";
import Summary from "./features/courses/Summary/Summary";
=======
import AdminDashboardPage from "./features/admin/pages/AdminDashboardPage";
import RequireAdminRole from "./features/admin/components/RequireAdminRole";
>>>>>>> origin/main

const APP_MODE: "edu" | "llm" | "dev" = import.meta.env.VITE_APP_MODE;

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
        path: "/courses",
        element: <Homepage />,
    },
    {
        path: "/course/:id",
        element: <GeneticsCourse />,
    },
    {
        path: "/courses/library",
        element: <MaterialLibrary />,
    },
    {
        path: "/courses/summary",
        element: <Summary />,
    },
];

const adminRoutes: RouteObject[] = [
    {
        path: "/admin",
        element: (
            <RequireAuth>
                <RequireAdminRole>
                    <AdminDashboardPage />
                </RequireAdminRole>
            </RequireAuth>
        ),
    },
];

const enableChatRoutes = ["llm", "dev"].includes(APP_MODE);
const enableCourseRoutes = ["edu", "dev"].includes(APP_MODE);
const enableAdminDemo =
    import.meta.env.DEV && import.meta.env.VITE_ADMIN_DEMO_MODE === "true";

export const router = createBrowserRouter([
    ...(enableCourseRoutes && enableAdminDemo
        ? [
              {
                  path: "/admin",
                  element: <AdminDashboardPage />,
                  errorElement: <RouteErrorBoundary />,
              },
          ]
        : []),
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
            ...(enableCourseRoutes && !enableAdminDemo ? adminRoutes : []),
            {
                path: "*",
                element: <NotFoundPage />,
            },
        ],
    },
]);
