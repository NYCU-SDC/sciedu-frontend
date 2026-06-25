import { createBrowserRouter } from "react-router";
import GeneticsCourse from "./features/courses/genetics/GeneticsCourse";
import ChatPage from "./features/chat/pages/ChatPage";
import ExampleChatPage from "./features/chat/pages/ExampleChatPage";
import LoginPage from "./features/auth/pages/LoginPage";
import { AuthProvider } from "./shared/auth";

export const router = createBrowserRouter([
    {
        element: <AuthProvider />,
        children: [
            {
                path: "/",
                element: <div>Hello World</div>,
            },
            {
                path: "/login",
                element: <LoginPage />,
            },
            {
                path: "/chat",
                element: <ChatPage />,
            },
            {
                path: "/examplechat",
                element: <ExampleChatPage />,
            },
            {
                path: "/course/:id",
                element: <GeneticsCourse />,
            },
        ],
    },
]);
