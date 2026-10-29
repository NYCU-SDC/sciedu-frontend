import PortalHome from "./features/experience/PortalHome";
import {
    ChatPreview,
    CourseChatPreview,
} from "./features/chat/pages/lazyPreview";
import { Suspense } from "react";
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
import Homepage from "./features/courses/Homepage/Homepage";
import MaterialLibrary from "./features/courses/MaterialLibrary/MaterialLibrary";
import Summary from "./features/courses/Summary/Summary";
import AdminDashboardPage from "./features/admin/pages/AdminDashboardPage";
import RequireAdminRole from "./features/admin/components/RequireAdminRole";
import ExperimentListPage from "./features/admin/pages/ExperimentListPage";
import ExperimentDetailPage from "./features/admin/pages/ExperimentDetailPage";
import CreateExperimentPage from "./features/admin/pages/CreateExperimentPage";

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
                path: "/chat",
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
        element: (
            <RequireAuth>
                <Homepage />
            </RequireAuth>
        ),
    },
    {
        path: "/course/:courseId",
        element: (
            <RequireAuth>
                <GeneticsCourse />
            </RequireAuth>
        ),
    },
    {
        path: "/courses/library",
        element: (
            <RequireAuth>
                <MaterialLibrary />
            </RequireAuth>
        ),
    },
    {
        path: "/courses/summary",
        element: (
            <RequireAuth>
                <Summary />
            </RequireAuth>
        ),
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
    {
        path: "/admin/experiments",
        element: (
            <RequireAuth>
                <RequireAdminRole>
                    <ExperimentListPage />
                </RequireAdminRole>
            </RequireAuth>
        ),
    },
    {
        path: "/admin/experiments/new",
        element: (
            <RequireAuth>
                <RequireAdminRole>
                    <CreateExperimentPage />
                </RequireAdminRole>
            </RequireAuth>
        ),
    },
    {
        path: "/admin/experiments/:experimentId",
        element: (
            <RequireAuth>
                <RequireAdminRole>
                    <ExperimentDetailPage />
                </RequireAdminRole>
            </RequireAuth>
        ),
    },
    {
        path: "/admin/experiments/:experimentId/edit",
        element: (
            <RequireAuth>
                <RequireAdminRole>
                    <CreateExperimentPage />
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
    ...(import.meta.env.DEV && import.meta.env.VITE_CHAT_MODE === "mock"
        ? [
              {
                  path: "/chat-preview",
                  element: (
                      <Suspense fallback={<p>載入預覽…</p>}>
                          <ChatPreview />
                      </Suspense>
                  ),
                  children: [
                      {
                          path: "course",
                          element: (
                              <Suspense fallback={<p>載入預覽…</p>}>
                                  <CourseChatPreview />
                              </Suspense>
                          ),
                      },
                      {
                          element: <ChatLayout basePath="/chat-preview" />,
                          children: [
                              {
                                  index: true,
                                  element: (
                                      <NewChatPage basePath="/chat-preview" />
                                  ),
                              },
                              {
                                  path: "chat/:chatID",
                                  element: <ChatConversationPage />,
                              },
                          ],
                      },
                  ],
              },
          ]
        : []),
    ...(enableCourseRoutes && enableAdminDemo
        ? [
              {
                  path: "/admin",
                  element: <AdminDashboardPage />,
                  errorElement: <RouteErrorBoundary />,
              },
              {
                  path: "/admin/experiments",
                  element: <ExperimentListPage />,
                  errorElement: <RouteErrorBoundary />,
              },
              {
                  path: "/admin/experiments/new",
                  element: <CreateExperimentPage />,
                  errorElement: <RouteErrorBoundary />,
              },
              {
                  path: "/admin/experiments/:experimentId",
                  element: <ExperimentDetailPage />,
                  errorElement: <RouteErrorBoundary />,
              },
              {
                  path: "/admin/experiments/:experimentId/edit",
                  element: <CreateExperimentPage />,
                  errorElement: <RouteErrorBoundary />,
              },
          ]
        : []),
    {
        element: <AuthProvider />,
        errorElement: <RouteErrorBoundary />,
        children: [
            {
                path: "/",
                element: (
                    <RequireAuth>
                        <PortalHome />
                    </RequireAuth>
                ),
            },
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
