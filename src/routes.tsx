import { createBrowserRouter } from "react-router";
import ChatPage from "./pages/ChatPage";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <div>Hello World</div>,
    },
<<<<<<< HEAD
=======
    {
        path: "/chat",
        element: <ChatPage />,
    },
    {
        path: "/testing",
        element: <></>,
    },
>>>>>>> 4b28030 (feat: create pages initialize chat and chat content)
]);
