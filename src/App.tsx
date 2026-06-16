import { RouterProvider } from "react-router/dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Theme } from "@radix-ui/themes";
import { CookiesProvider } from "react-cookie";
import { Toaster } from "sonner";

import "@radix-ui/themes/styles.css";
import "@fontsource/noto-serif-tc/700.css";

import { router } from "./routes";

const queryClient = new QueryClient();

function App() {
    return (
        <CookiesProvider>
            <QueryClientProvider client={queryClient}>
                <Theme>
                    <RouterProvider router={router} />
                    <Toaster />
                </Theme>
            </QueryClientProvider>
        </CookiesProvider>
    );
}

export default App;
