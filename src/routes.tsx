import { createBrowserRouter } from "react-router";
import ChatPage from "./features/chat/pages/ChatPage";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <div>Hello World</div>,
    },
    {
        path: "/chat",
        element: <ChatPage />,
    },
]);
