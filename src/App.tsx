import { RouterProvider } from "react-router/dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Theme } from "@radix-ui/themes";
import { Toaster } from "sonner";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@radix-ui/themes/styles.css";
import { router } from "./routes";
import { mantineTheme } from "./mantineTheme";

const queryClient = new QueryClient();
function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <MantineProvider theme={mantineTheme}>
                {/* existing app providers/components */}
                <Theme>
                    <RouterProvider router={router} />
                    <Toaster />
                </Theme>
            </MantineProvider>
        </QueryClientProvider>
    );
}

export default App;
