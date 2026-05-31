import { createBrowserRouter } from "react-router";
import GeneticsCourse from "./features/courses/genetics/GeneticsCourse";
import ChatPage from "./features/chat/pages/ChatPage";
import ExampleChatPage from "./features/chat/pages/ExampleChatPage";
import LoginPage from "./features/auth/pages/LoginPage";
import {
    AuthRouteRoot,
    PublicOnlyAuthRoute,
    RequireAuth,
} from "./features/auth/components/AuthRoutes";

export const router = createBrowserRouter([
    {
        element: <AuthRouteRoot />,
        children: [
            {
                path: "/",
                element: <div>Hello World</div>,
            },
            {
                element: <PublicOnlyAuthRoute />,
                children: [
                    {
                        path: "/login",
                        element: <LoginPage />,
                    },
                ],
            },
            {
                element: <RequireAuth />,
                children: [
                    {
                        path: "/course/:id",
                        element: <GeneticsCourse />,
                    },
                    {
                        path: "/chat",
                        element: <ChatPage />,
                    },
                    {
                        path: "/examplechat",
                        element: <ExampleChatPage />,
                    },
                ],
            },
        ],
    },
]);
