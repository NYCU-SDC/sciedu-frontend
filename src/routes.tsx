import { createBrowserRouter } from "react-router";
import { chatRoutes } from "@/features/chat";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <div>Hello World</div>,
    },
    ...chatRoutes,
    {
        path: "/testing",
        element: <></>,
    },
]);
