import { RouterProvider } from "react-router/dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Theme } from "@radix-ui/themes";
import { Toaster } from "sonner";

import "@radix-ui/themes/styles.css";

import { router } from "./routes";

const queryClient = new QueryClient();

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <Theme>
                <RouterProvider router={router} />
                <Toaster />
            </Theme>
        </QueryClientProvider>
    );
}

export default App;
