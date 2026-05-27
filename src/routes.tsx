import { createBrowserRouter } from "react-router";
import GeneticsCourse from "./features/courses/genetics/GeneticsCourse";
import ChatPage from "./features/chat/pages/ChatPage";

export const router = createBrowserRouter([
    {
        path: "/course/:id",
        element: <GeneticsCourse />,
    },
    {
        // Single route with optional :chatId so transitioning between /chat
        // and /chat/<id> reconciles ChatPage in place. Two separate route
        // entries would unmount/remount the component mid-send and drop the
        // in-flight stream state.
        path: "/chat/:chatId?",
        element: <ChatPage />,
    },
]);
