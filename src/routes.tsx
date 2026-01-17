import { createBrowserRouter } from "react-router";
import GeneticsCourse from "./features/courses/genetics/GeneticsCourse";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <div>Hello World</div>,
    },
    {
        path: "/courses/:id",
        element: <GeneticsCourse />,
    },
]);
