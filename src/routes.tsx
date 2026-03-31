import { createBrowserRouter } from "react-router";
import GeneticsCourse from "./features/courses/genetics/GeneticsCourse";
import ChatPage from "./features/chat/pages/ChatPage";
import ExampleChatPage from "./features/chat/pages/ExampleChatPage";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <div>Hello World</div>,
    },
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
]);
